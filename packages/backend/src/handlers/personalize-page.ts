import type { TaskHandler } from "../engine/types.js";
import type { ContactOutput } from "@valid8/shared";
import { nanoid } from "nanoid";
import { db, schema } from "../db/index.js";

const BASE_URL = (process.env.BASE_URL ?? `http://localhost:${process.env.PORT || 3000}`).replace(
  /\/+$/,
  "",
);

interface BasePageOut {
  pageId: string;
  url: string;
  html: string;
}

interface Output {
  variantId: string;
  url: string;
  contactId: string;
}

/**
 * One row per contact: same HTML as the base page for now, unique /p/:id for tracking.
 * Runs after both base_landing_page and contact_discovery so the contact exists in discovery output.
 */
export const personalizePageHandler: TaskHandler<
  { contact: ContactOutput["contacts"][number]; base: BasePageOut },
  Output
> = {
  type: "personalize_page",
  dependencies: [
    { kind: "after", taskType: "base_landing_page" },
    { kind: "after", taskType: "contact_discovery" },
  ],
  resolveInput: (ctx) => {
    const base = ctx.getTaskOutput("base_landing_page") as BasePageOut;
    const contact = ctx.requireScopedContact() as ContactOutput["contacts"][number];
    return { contact, base };
  },
  execute: async (input, ctx) => {
    const variantId = nanoid();
    const url = `${BASE_URL}/p/${variantId}`;
    await db.insert(schema.landingPageVariants).values({
      id: variantId,
      workflowId: ctx.workflowId,
      contactId: input.contact.id,
      basePageId: input.base.pageId,
      html: input.base.html,
      url,
      personalizationJson: JSON.stringify({
        name: input.contact.name,
        company: input.contact.company,
        role: input.contact.role,
      }),
    });
    return { variantId, url, contactId: input.contact.id };
  },
};
