// InsForge integration — deploys landing pages to InsForge Storage
//
// Required env vars:
//   INSFORGE_URL     — Your project URL, e.g. https://your-project.insforge.app
//   INSFORGE_API_KEY — API key from the InsForge dashboard
//
// If not configured, the landing page handler still generates HTML via AI
// but won't deploy it to a public URL. The frontend shows it via srcdoc.
//
// Docs: https://docs.insforge.dev/sdks/rest/storage

const INSFORGE_URL_RAW = process.env.INSFORGE_URL;
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY;
const BUCKET = "landing-pages";

/** Base URL with no trailing slash — avoids `//api/...` when env has a trailing `/`. */
function baseUrl(): string {
  return (INSFORGE_URL_RAW ?? "").replace(/\/+$/, "");
}

export function isConfigured(): boolean {
  return !!(INSFORGE_URL_RAW?.trim() && INSFORGE_API_KEY);
}

let bucketReady = false;

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const origin = baseUrl();
  if (!origin || !INSFORGE_API_KEY) {
    throw new Error("InsForge not configured — set INSFORGE_URL and INSFORGE_API_KEY");
  }
  const pathPart = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${origin}${pathPart}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${INSFORGE_API_KEY}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const res = await request("/api/storage/buckets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucketName: BUCKET, isPublic: true }),
  });
  // 409 = bucket already exists, which is fine
  if (!res.ok && res.status !== 409) {
    const body = await res.text();
    throw new Error(`InsForge: failed to create bucket (${res.status}): ${body}`);
  }
  bucketReady = true;
}

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadPage(workflowId: string, html: string): Promise<UploadResult> {
  await ensureBucket();

  const key = `${workflowId}.html`;
  const blob = new Blob([html], { type: "text/html" });
  const formData = new FormData();
  formData.append("file", blob, key);

  const res = await request(
    `/api/storage/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`,
    { method: "PUT", body: formData },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`InsForge: failed to upload page (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { url: string; key?: string };
  const raw = data.url.trim();
  // API may return a path (/api/...) or a full URL — never prefix "/" before "https://" or we break links.
  let publicUrl: string;
  if (/^https?:\/\//i.test(raw)) {
    publicUrl = raw;
  } else {
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    publicUrl = `${baseUrl()}${path}`;
  }
  return { url: publicUrl, key: data.key ?? key };
}
