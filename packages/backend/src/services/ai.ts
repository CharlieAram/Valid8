import { generateObject, generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type {
  IdeaConfirmationOutput,
  MarketResearchOutput,
  AssumptionOutput,
  PersonaOutput,
  ContactOutput,
  ResultsSummaryOutput,
} from "@valid8/shared";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const model = anthropic(process.env.AI_MODEL ?? "claude-sonnet-4-20250514");

export async function generateIdeaConfirmation(
  ideaText: string
): Promise<IdeaConfirmationOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      summary: z.string().describe("A clear 2-3 sentence summary of the business idea"),
      targetMarket: z.string().describe("Who this is for"),
      valueProposition: z.string().describe("What value it delivers"),
      revenueModel: z.string().describe("How it makes money"),
    }),
    prompt: `You are helping validate a B2B software business idea. Analyze this idea and produce a structured understanding of it. Be specific and concise.

Idea: ${ideaText}`,
  });
  return object;
}

export async function generateMarketResearch(
  idea: string
): Promise<MarketResearchOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      overview: z.string(),
      marketSize: z.string(),
      competitors: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          strengths: z.string(),
          weaknesses: z.string(),
        })
      ),
      trends: z.array(z.string()),
      opportunities: z.array(z.string()),
      risks: z.array(z.string()),
    }),
    prompt: `Conduct deep market research for this B2B software idea. Identify real competitors, market trends, opportunities, and risks. Be specific with names and data.

Idea: ${idea}`,
  });
  return object;
}

export async function generateAssumptions(
  idea: string,
  research: MarketResearchOutput
): Promise<AssumptionOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      assumptions: z.array(
        z.object({
          id: z.string(),
          statement: z.string().describe("A testable hypothesis: 'We believe that...'"),
          category: z.enum(["desirability", "feasibility", "viability"]),
          criticality: z.enum(["high", "medium", "low"]),
        })
      ),
    }),
    prompt: `Based on this B2B idea and market research, generate testable assumptions following lean startup methodology. Focus on "What has to be true for this business to work?"

Idea: ${idea}

Market Research:
${JSON.stringify(research, null, 2)}`,
  });
  return object;
}

export async function generatePersonas(
  idea: string,
  assumptions: AssumptionOutput
): Promise<PersonaOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      personas: z.array(
        z.object({
          id: z.string(),
          title: z.string().describe("e.g. 'VP of Engineering at Series B SaaS'"),
          description: z.string(),
          jobsToBeDone: z.array(z.string()),
          painPoints: z.array(z.string()),
          companies: z.array(z.string()).describe("Types of companies or specific company names"),
        })
      ),
    }),
    prompt: `Identify 3-5 target customer personas for this B2B idea. For each, define their jobs-to-be-done and pain points that this product would address. Be specific about company types.

Idea: ${idea}

Assumptions to validate:
${JSON.stringify(assumptions.assumptions, null, 2)}`,
  });
  return object;
}

export async function generateLandingPageHTML(
  idea: IdeaConfirmationOutput,
): Promise<string> {
  const { text } = await generateText({
    model,
    system: `You are an expert B2B SaaS landing page designer. Output a complete, self-contained HTML file.

Rules:
- Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no code fences, no commentary.
- Use <script src="https://cdn.tailwindcss.com"></script> for styling.
- Professional, modern B2B SaaS design: clean typography, ample whitespace, polished feel.
- Fully responsive — must look great on mobile and desktop.
- Include proper <head> with charset, viewport meta, title, and description meta tag.
- Use a cohesive blue/indigo primary color palette with neutral grays.
- Sections:
  1. Navbar with product name and "Get Started" anchor link
  2. Hero: bold benefit-focused headline, subheadline, primary CTA button
  3. Problem: 2-3 pain points the target market faces
  4. Solution: how the product solves them, with 3 feature cards (use inline SVG icons)
  5. Social proof: trust indicators like "Trusted by 100+ teams" and metric highlights
  6. Final CTA with email capture form (input + submit button, action="#" method="POST")
  7. Simple footer
- Add subtle hover states and transitions.
- Make the page feel like a real, launched product — not a template or wireframe.`,
    prompt: `Create a landing page for this B2B product:

Product: ${idea.summary}
Target market: ${idea.targetMarket}
Value proposition: ${idea.valueProposition}
Revenue model: ${idea.revenueModel}

Make the headline punchy and benefit-focused. Speak directly to the target market's pain points.`,
  });

  let html = text.trim();
  if (html.startsWith("```")) {
    html = html.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
  }
  return html;
}

export async function generateResultsSummary(
  idea: string,
  taskOutputs: Record<string, unknown>
): Promise<ResultsSummaryOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      verdict: z.enum(["validated", "invalidated", "inconclusive"]),
      confidence: z.number().min(0).max(100),
      quantitative: z.object({
        emailsSent: z.number(),
        emailsOpened: z.number(),
        pageVisits: z.number(),
        signups: z.number(),
        callsScheduled: z.number(),
        callsCompleted: z.number(),
      }),
      qualitative: z.object({
        keyInsights: z.array(z.string()),
        commonObjections: z.array(z.string()),
        positiveSignals: z.array(z.string()),
      }),
      recommendation: z.string(),
      pivotSuggestions: z.array(z.string()).optional(),
    }),
    prompt: `Analyze the validation results for this B2B idea and provide a clear verdict.

Idea: ${idea}

All collected data:
${JSON.stringify(taskOutputs, null, 2)}`,
  });
  return object;
}

export async function generateLandingPageHtml(
  idea: IdeaConfirmationOutput
): Promise<string> {
  const { text } = await generateText({
    model,
    prompt: `Generate a complete, self-contained HTML landing page for this B2B product. The page should be clean, professional, and conversion-focused. Include a hero section, value proposition, key benefits, social proof placeholder, and a clear CTA (email signup form). Use inline CSS. The page must be a single HTML file with no external dependencies.

Product summary: ${idea.summary}
Target market: ${idea.targetMarket}
Value proposition: ${idea.valueProposition}
Revenue model: ${idea.revenueModel}

Return ONLY the HTML, no markdown fences or explanation.`,
  });
  return text;
}

export async function generatePersonalizedPageHtml(
  baseHtml: string,
  contact: { name: string; company: string; role: string }
): Promise<string> {
  const { text } = await generateText({
    model,
    prompt: `Take this landing page HTML and personalize it for a specific prospect. Adjust the headline, subheadline, and CTA copy to speak directly to their role and company. Keep the same layout and styling. Do NOT change the form or its action.

Contact: ${contact.name}, ${contact.role} at ${contact.company}

Base HTML:
${baseHtml}

Return ONLY the modified HTML, no markdown fences or explanation.`,
  });
  return text;
}

export async function generateContacts(
  persona: PersonaOutput["personas"][number],
  idea: string,
  count: number = 3
): Promise<Array<{ name: string; email: string; company: string; role: string; linkedinUrl?: string }>> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      contacts: z.array(
        z.object({
          name: z.string().describe("A realistic full name"),
          email: z.string().describe("A realistic business email"),
          company: z.string().describe("A real company that fits this persona"),
          role: z.string().describe("Their specific job title"),
          linkedinUrl: z.string().optional(),
        })
      ),
    }),
    prompt: `Generate ${count} realistic synthetic contacts for outreach testing. These should be plausible people who match this target persona at real companies in this space. Use realistic names and company-appropriate email formats (e.g., firstname@company.com). These are for validation testing purposes.

Persona: ${persona.title}
Description: ${persona.description}
Target companies: ${persona.companies.join(", ")}
Pain points: ${persona.painPoints.join(", ")}

Business idea being validated: ${idea}

Generate contacts that would be real decision-makers or influencers for this type of product.`,
  });
  return object.contacts;
}

export async function generateOutreachEmail(
  contact: { name: string; company: string; role: string },
  idea: IdeaConfirmationOutput,
  pageUrl: string
): Promise<{ subject: string; body: string; html: string }> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      subject: z.string().describe("Short, compelling email subject line (no spam triggers)"),
      body: z.string().describe("Plain text email body"),
      html: z.string().describe("HTML email body with simple formatting"),
    }),
    prompt: `Write a personalized cold outreach email for B2B idea validation. The email should:
- Be concise (under 150 words)
- Reference the contact's specific role and company
- Lead with a relevant pain point or insight
- Include a soft CTA to check out the landing page
- Sound human, not templated
- NOT be salesy or pushy — this is research/validation, not a hard sell

Contact: ${contact.name}, ${contact.role} at ${contact.company}
Product: ${idea.summary}
Value proposition: ${idea.valueProposition}
Target market: ${idea.targetMarket}
Landing page URL: ${pageUrl}

The HTML should be clean and simple — no heavy design, just well-formatted text with the link.`,
  });
  return object;
}
