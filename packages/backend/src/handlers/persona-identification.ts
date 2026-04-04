import type { TaskHandler } from "../engine/types.js";
import { generatePersonas } from "../services/ai.js";
import type {
  IdeaConfirmationOutput,
  AssumptionOutput,
  PersonaOutput,
} from "@valid8/shared";

interface Input {
  idea: string;
  assumptions: AssumptionOutput;
}

export const personaIdentificationHandler: TaskHandler<Input, PersonaOutput> = {
  type: "persona_identification",
  dependencies: [{ kind: "after", taskType: "assumption_generation" }],
  resolveInput: (ctx) => {
    const confirmation = ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
    const assumptions = ctx.getTaskOutput("assumption_generation") as AssumptionOutput;
    return { idea: confirmation.summary, assumptions };
  },
  execute: async (input) => {
    return generatePersonas(input.idea, input.assumptions);
  },
};
