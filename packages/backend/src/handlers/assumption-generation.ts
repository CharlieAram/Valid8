import type { TaskHandler } from "../engine/types.js";
import { generateAssumptions } from "../services/ai.js";
import type {
  IdeaConfirmationOutput,
  MarketResearchOutput,
  AssumptionOutput,
} from "@valid8/shared";

interface Input {
  idea: string;
  research: MarketResearchOutput;
}

export const assumptionGenerationHandler: TaskHandler<Input, AssumptionOutput> = {
  type: "assumption_generation",
  dependencies: [{ kind: "after", taskType: "market_research" }],
  resolveInput: (ctx) => {
    const confirmation = ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
    const research = ctx.getTaskOutput("market_research") as MarketResearchOutput;
    return { idea: confirmation.summary, research };
  },
  execute: async (input) => {
    return generateAssumptions(input.idea, input.research);
  },
};
