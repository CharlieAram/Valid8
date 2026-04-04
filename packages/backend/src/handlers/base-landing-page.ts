import type { TaskHandler } from "../engine/types.js";
import type { IdeaConfirmationOutput } from "@valid8/shared";
import { generateLandingPageHTML } from "../services/ai.js";
import * as insforge from "../services/insforge.js";

interface Output {
  pageId: string;
  url: string;
  html: string;
}

export const baseLandingPageHandler: TaskHandler<IdeaConfirmationOutput, Output> = {
  type: "base_landing_page",
  dependencies: [{ kind: "after", taskType: "idea_confirmation" }],
  resolveInput: (ctx) => {
    return ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
  },
  execute: async (input, ctx) => {
    const html = await generateLandingPageHTML(input);

    if (insforge.isConfigured()) {
      try {
        const { url } = await insforge.uploadPage(ctx.workflowId, html);
        console.log(`[InsForge] Landing page deployed: ${url}`);
        return { pageId: `page_${ctx.workflowId}`, url, html };
      } catch (err) {
        console.error("[InsForge] Upload failed, returning HTML without hosted URL:", err);
      }
    }

    // InsForge not configured or upload failed — HTML is still available via srcdoc
    return {
      pageId: `page_${ctx.workflowId}`,
      url: `placeholder://landing-page-not-deployed`,
      html,
    };
  },
};
