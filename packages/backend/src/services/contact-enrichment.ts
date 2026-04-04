import type { ContactDiscoveryResult } from "@valid8/shared";
import type { TavilySearchResult } from "./tavily.js";
import { tavilySearch } from "./tavily.js";

export interface ContactEnrichmentInput {
  personaTitle: string;
  company: string;
}

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const SKIP_EMAIL =
  /^(noreply|no-reply|donotreply|privacy|legal|support|help|mailer-daemon|postmaster)@/i;

function isPlaceholderEmail(e: string): boolean {
  const lower = e.toLowerCase();
  return (
    lower.includes("example.com") ||
    lower.includes("example.org") ||
    lower.includes("test.com") ||
    lower.endsWith("@localhost")
  );
}

function pickBestEmail(text: string): string | null {
  const found = text.match(EMAIL_RE) ?? [];
  const ok = found.filter((e) => !SKIP_EMAIL.test(e) && !isPlaceholderEmail(e));
  return ok[0] ?? null;
}

const LINKEDIN_RE = /https?:\/\/(?:[\w.-]+\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi;
const TWITTER_RE = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,30}/gi;
const IG_RE = /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._]{1,30}/gi;
const REDDIT_RE = /https?:\/\/(?:www\.)?reddit\.com\/(?:user|u)\/[a-zA-Z0-9_-]{2,30}/gi;

function firstMatch(re: RegExp, text: string): string | undefined {
  re.lastIndex = 0;
  const m = re.exec(text);
  return m ? m[0].split("?")[0] : undefined;
}

function collectSources(
  ...responses: Awaited<ReturnType<typeof tavilySearch>>[]
): ContactDiscoveryResult["sources"] {
  const seen = new Set<string>();
  const out: ContactDiscoveryResult["sources"] = [];
  for (const r of responses) {
    for (const item of r.results) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      out.push({ url: item.url, title: item.title });
      if (out.length >= 12) return out;
    }
  }
  return out;
}

/** LinkedIn SERP titles look like: "Jane Doe - VP Engineering - Acme | LinkedIn" */
function parseNameFromLinkedInTitle(title: string): string | null {
  if (!title?.trim()) return null;
  let t = title
    .replace(/\s*\|\s*LinkedIn.*$/i, "")
    .replace(/\s*-\s*LinkedIn.*$/i, "")
    .replace(/\s+on\s+LinkedIn.*$/i, "")
    .trim();

  const firstSegment = t.split(/\s*[-–|]\s+/)[0]?.trim() ?? t;
  const cleaned = firstSegment.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (cleaned.length < 3) return null;

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  if (!/^[A-Za-z\s.'-]+$/.test(cleaned)) return null;

  return cleaned;
}

/** Derive a display name from linkedin.com/in/jane-doe-123abc (drops trailing id chunks). */
function nameFromLinkedInUrl(url: string): string | null {
  const m = url.match(/linkedin\.com\/in\/([^/?]+)/i);
  if (!m) return null;
  const seg = decodeURIComponent(m[1]);
  const parts = seg.split("-").filter((p) => p.length > 1 && !/^\d{6,}$/.test(p));
  if (parts.length < 2) return null;
  return parts
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function scoreLinkedInResult(
  r: TavilySearchResult,
  personaTitle: string,
  company: string
): number {
  const blob = `${r.title} ${r.content} ${r.url}`.toLowerCase();
  let s = 0;
  const companyTok = company.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)[0];
  if (companyTok && companyTok.length > 2 && blob.includes(companyTok)) s += 3;

  for (const w of personaTitle.toLowerCase().split(/\s+/)) {
    if (w.length > 3 && blob.includes(w)) s += 1;
  }
  if (/linkedin\.com\/in\//i.test(r.url)) s += 2;
  return s;
}

function pickBestLinkedInResult(
  results: TavilySearchResult[],
  personaTitle: string,
  company: string
): TavilySearchResult | null {
  const li = results.filter((r) => /linkedin\.com\/in\//i.test(r.url));
  if (li.length === 0) return null;
  return [...li].sort(
    (a, b) => scoreLinkedInResult(b, personaTitle, company) - scoreLinkedInResult(a, personaTitle, company)
  )[0];
}

function extractFromBlob(text: string): Pick<ContactDiscoveryResult, "email" | "linkedinUrl" | "social"> {
  const email = pickBestEmail(text);
  const linkedinUrl = firstMatch(LINKEDIN_RE, text);
  const tw = firstMatch(TWITTER_RE, text);
  const ig = firstMatch(IG_RE, text);
  const reddit = firstMatch(REDDIT_RE, text);
  const social: NonNullable<ContactDiscoveryResult["social"]> = {};
  if (tw) social.twitter = tw;
  if (ig) social.instagram = ig;
  if (reddit) social.reddit = reddit;
  return {
    email,
    linkedinUrl,
    social: Object.keys(social).length > 0 ? social : undefined,
  };
}

function resolveFullName(
  bestLi: TavilySearchResult | null,
  extractedLinkedin: string | undefined,
  personaTitle: string,
  company: string
): string {
  if (bestLi?.title) {
    const fromTitle = parseNameFromLinkedInTitle(bestLi.title);
    if (fromTitle) return fromTitle;
  }
  const url = bestLi?.url ?? extractedLinkedin;
  if (url) {
    const fromSlug = nameFromLinkedInUrl(url);
    if (fromSlug) return fromSlug;
  }
  return `${personaTitle} at ${company}`;
}

/**
 * Uses Tavily to find real people (LinkedIn-first), then extracts name from profile titles/URLs.
 */
export async function enrichContactChannels(
  input: ContactEnrichmentInput,
  contactIndex: number
): Promise<ContactDiscoveryResult> {
  const { company, personaTitle } = input;

  if (!process.env.TAVILY_API_KEY?.trim()) {
    return fallbackDummy(personaTitle, company, contactIndex, "TAVILY_API_KEY not set.");
  }

  try {
    const q1 = `Who are real people working as ${personaTitle} at ${company}? Names and LinkedIn profiles.`;
    const q2 = `site:linkedin.com/in "${company}" ${personaTitle}`;

    const [r1, r2] = await Promise.all([
      tavilySearch(q1, { maxResults: 8, includeAnswer: true }),
      tavilySearch(q2, { maxResults: 8, includeAnswer: false }),
    ]);

    const allResults = [...r1.results, ...r2.results];
    const bestLi = pickBestLinkedInResult(allResults, personaTitle, company);

    const blob = [
      r1.answer ?? "",
      ...allResults.map((x) => `${x.title}\n${x.url}\n${x.content}`),
    ].join("\n\n");

    const extracted = extractFromBlob(blob);
    const linkedinUrl =
      bestLi && /linkedin\.com\/in\//i.test(bestLi.url)
        ? bestLi.url.split("?")[0]
        : extracted.linkedinUrl;

    const fullName = resolveFullName(bestLi, linkedinUrl, personaTitle, company);

    const sources = collectSources(r1, r2);

    const resolutionNotes = [
      `Tavily: ${allResults.length} results`,
      linkedinUrl ? "LinkedIn: resolved" : "LinkedIn: not found",
      extracted.email ? "email: in snippets" : "email: none",
    ].join(" · ");

    return {
      fullName,
      email: extracted.email,
      linkedinUrl,
      social: extracted.social,
      sources,
      resolutionNotes,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fallbackDummy(personaTitle, company, contactIndex, `Tavily error: ${msg}`);
  }
}

function fallbackDummy(
  personaTitle: string,
  company: string,
  contactIndex: number,
  reason: string
): ContactDiscoveryResult {
  return {
    fullName: `${personaTitle} at ${company}`,
    email: null,
    sources: [],
    resolutionNotes: `[fallback] ${reason} (#${contactIndex})`,
  };
}
