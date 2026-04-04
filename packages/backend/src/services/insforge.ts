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

const INSFORGE_URL = process.env.INSFORGE_URL;
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY;
const BUCKET = "landing-pages";

export function isConfigured(): boolean {
  return !!(INSFORGE_URL && INSFORGE_API_KEY);
}

let bucketReady = false;

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  if (!INSFORGE_URL || !INSFORGE_API_KEY) {
    throw new Error("InsForge not configured — set INSFORGE_URL and INSFORGE_API_KEY");
  }
  return fetch(`${INSFORGE_URL}${path}`, {
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
  return { url: `${INSFORGE_URL}${data.url}`, key: data.key ?? key };
}
