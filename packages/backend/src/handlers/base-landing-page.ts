import type { TaskHandler } from "../engine/types.js";
import { generateLandingPage } from "../services/insforge.js";
import type { IdeaConfirmationOutput } from "@valid8/shared";

interface Output {
  pageId: string;
  url: string;
}

export const baseLandingPageHandler: TaskHandler<IdeaConfirmationOutput, Output> = {
  type: "base_landing_page",
  dependencies: [{ kind: "after", taskType: "idea_confirmation" }],
  resolveInput: (ctx) => {
    return ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
  },
  execute: async (input) => {
    const result = await generateLandingPage({
      ideaSummary: input.summary,
      valueProposition: input.valueProposition,
      targetMarket: input.targetMarket,
    });
    return { pageId: result.pageId, url: result.url };
  },
};
