import type { TaskHandler } from "../engine/types.js";
import { generateResultsSummary } from "../services/ai.js";
import type { IdeaConfirmationOutput, ResultsSummaryOutput } from "@valid8/shared";

export const resultsSummaryHandler: TaskHandler<Record<string, unknown>, ResultsSummaryOutput> = {
  type: "results_summary",
  dependencies: [{ kind: "afterAll", taskType: "schedule_human_call" }],
  resolveInput: (ctx) => {
    return {
      idea: ctx.getTaskOutput("idea_confirmation"),
      research: ctx.getTaskOutput("market_research"),
      assumptions: ctx.getTaskOutput("assumption_generation"),
      personas: ctx.getTaskOutput("persona_identification"),
      contacts: ctx.getTaskOutput("contact_discovery"),
    };
  },
  execute: async (inputs) => {
    const idea = inputs.idea as IdeaConfirmationOutput;
    return generateResultsSummary(idea.summary, inputs);
  },
};
