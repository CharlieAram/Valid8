import type { TaskHandler } from "../engine/types.js";
import { personalizeLandingPage } from "../services/insforge.js";
import type { ContactOutput } from "@valid8/shared";

interface Input {
  basePageId: string;
  contact: ContactOutput["contacts"][number];
}

interface Output {
  variantId: string;
  url: string;
}

export const personalizePageHandler: TaskHandler<Input, Output> = {
  type: "personalize_page",
  dependencies: [
    { kind: "after", taskType: "base_landing_page" },
    { kind: "after", taskType: "contact_discovery" },
  ],
  resolveInput: (ctx) => {
    const basePage = ctx.getTaskOutput("base_landing_page") as { pageId: string };
    const contact = ctx.requireScopedContact() as ContactOutput["contacts"][number];
    return { basePageId: basePage.pageId, contact };
  },
  execute: async (input) => {
    const result = await personalizeLandingPage({
      basePageId: input.basePageId,
      contactName: input.contact.name,
      contactCompany: input.contact.company,
      contactRole: input.contact.role,
    });
    return { variantId: result.variantId, url: result.url };
  },
};
