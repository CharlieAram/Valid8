// Landing pages: HTML stored locally for /p/:id; optional deploy to InsForge Storage.
//
// Env (InsForge deploy — optional):
//   INSFORGE_URL     — e.g. https://your-project.insforge.app
//   INSFORGE_API_KEY — from InsForge dashboard
//
// Env (local preview URL in emails / UI):
//   BASE_URL — e.g. http://localhost:3000 (default)
//
// Docs: https://docs.insforge.dev/sdks/rest/storage

import { nanoid } from "nanoid";
import { db, schema } from "../db/index.js";

const INSFORGE_URL_RAW = process.env.INSFORGE_URL;
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY;
const BUCKET = "landing-pages";

const BASE_URL = (process.env.BASE_URL ?? `http://localhost:${process.env.PORT || 3000}`).replace(
  /\/+$/,
  "",
);

/** Base URL with no trailing slash — avoids `//api/...` when env has a trailing `/`. */
function insforgeOrigin(): string {
  return (INSFORGE_URL_RAW ?? "").replace(/\/+$/, "");
}

export function isConfigured(): boolean {
  return !!(INSFORGE_URL_RAW?.trim() && INSFORGE_API_KEY);
}

let bucketReady = false;

async function insforgeRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const origin = insforgeOrigin();
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
  const res = await insforgeRequest("/api/storage/buckets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucketName: BUCKET, isPublic: true }),
  });
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

async function uploadToInsforge(workflowId: string, html: string): Promise<UploadResult> {
  await ensureBucket();

  const key = `${workflowId}.html`;
  const blob = new Blob([html], { type: "text/html" });
  const formData = new FormData();
  formData.append("file", blob, key);

  const res = await insforgeRequest(
    `/api/storage/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`,
    { method: "PUT", body: formData },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`InsForge: failed to upload page (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { url: string; key?: string };
  const raw = data.url.trim();
  let publicUrl: string;
  if (/^https?:\/\//i.test(raw)) {
    publicUrl = raw;
  } else {
    const p = raw.startsWith("/") ? raw : `/${raw}`;
    publicUrl = `${insforgeOrigin()}${p}`;
  }
  return { url: publicUrl, key: data.key ?? key };
}

export interface GenerateLandingPageParams {
  workflowId: string;
  html: string;
}

export interface GenerateLandingPageResult {
  pageId: string;
  url: string;
}

/** Saves HTML locally, then tries InsForge — prefers hosted URL when configured. */
export async function generateLandingPage(
  params: GenerateLandingPageParams,
): Promise<GenerateLandingPageResult> {
  const pageId = nanoid();

  await db.insert(schema.landingPages).values({
    id: pageId,
    workflowId: params.workflowId,
    html: params.html,
  });

  if (isConfigured()) {
    try {
      const { url } = await uploadToInsforge(params.workflowId, params.html);
      console.log(`[InsForge] Landing page deployed: ${url}`);
      return { pageId, url };
    } catch (err) {
      console.error("[InsForge] Upload failed, using local /p URL:", err);
    }
  }

  return { pageId, url: `${BASE_URL}/p/${pageId}` };
}
