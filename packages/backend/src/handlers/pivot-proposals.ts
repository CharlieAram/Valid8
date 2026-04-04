import type { TaskHandler } from "../engine/types.js";
import { generatePivotProposals } from "../services/ai.js";
import type {
  IdeaConfirmationOutput,
  MarketResearchOutput,
  ResultsSummaryOutput,
  PivotProposalsOutput,
} from "@valid8/shared";

export const pivotProposalsHandler: TaskHandler<
  { idea: string; results: ResultsSummaryOutput; research: MarketResearchOutput },
  PivotProposalsOutput
> = {
  type: "pivot_proposals",
  dependencies: [{ kind: "after", taskType: "results_summary" }],
  resolveInput: (ctx) => {
    const confirmation = ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
    const results = ctx.getTaskOutput("results_summary") as ResultsSummaryOutput;
    const research = ctx.getTaskOutput("market_research") as MarketResearchOutput;
    return { idea: confirmation.summary, results, research };
  },
  execute: async ({ idea, results, research }) => {
    return generatePivotProposals(idea, results, research);
  },
};
