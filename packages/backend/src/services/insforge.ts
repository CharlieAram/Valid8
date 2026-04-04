import { nanoid } from "nanoid";
import { db, schema } from "../db/index.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export interface GenerateLandingPageParams {
  workflowId: string;
  html: string;
}

export interface GenerateLandingPageResult {
  pageId: string;
  url: string;
}

export async function generateLandingPage(
  params: GenerateLandingPageParams
): Promise<GenerateLandingPageResult> {
  const pageId = nanoid();

  await db.insert(schema.landingPages).values({
    id: pageId,
    workflowId: params.workflowId,
    html: params.html,
  });

  const url = `${BASE_URL}/p/${pageId}`;
  return { pageId, url };
}

export interface PersonalizePageParams {
  workflowId: string;
  basePageId: string;
  contactId: string;
  contactName: string;
  contactCompany: string;
  contactRole: string;
  html: string;
}

export interface PersonalizePageResult {
  variantId: string;
  url: string;
}

export async function personalizeLandingPage(
  params: PersonalizePageParams
): Promise<PersonalizePageResult> {
  const variantId = nanoid();
  const url = `${BASE_URL}/p/${variantId}`;

  await db.insert(schema.landingPageVariants).values({
    id: variantId,
    workflowId: params.workflowId,
    contactId: params.contactId,
    basePageId: params.basePageId,
    html: params.html,
    url,
    personalizationJson: JSON.stringify({
      name: params.contactName,
      company: params.contactCompany,
      role: params.contactRole,
    }),
  });

  return { variantId, url };
}
