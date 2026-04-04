import type { TaskHandler } from "../engine/types.js";
import { generateMarketResearch } from "../services/ai.js";
import type { IdeaConfirmationOutput, MarketResearchOutput } from "@valid8/shared";

export const marketResearchHandler: TaskHandler<string, MarketResearchOutput> = {
  type: "market_research",
  dependencies: [{ kind: "after", taskType: "idea_confirmation" }],
  resolveInput: (ctx) => {
    const confirmation = ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
    return confirmation.summary;
  },
  execute: async (idea) => {
    return generateMarketResearch(idea);
  },
};
