import type { TaskHandler } from "../engine/types.js";

// Created as waiting_for_input. The AI summary is generated in the route
// handler, then the user confirms via the API which calls completeHumanTask.
export const ideaConfirmationHandler: TaskHandler = {
  type: "idea_confirmation",
  dependencies: [],
  initialStatus: "waiting_for_input",
  resolveInput: () => null,
  execute: async () => {
    throw new Error("idea_confirmation should not be executed by scheduler");
  },
};
