import type { TaskHandler } from "../engine/types.js";
import type { ContactOutput } from "@valid8/shared";

interface Input {
  contact: ContactOutput["contacts"][number];
  voiceCallStatus: string;
}

interface Output {
  scheduled: boolean;
  reason?: string;
}

export const scheduleHumanCallHandler: TaskHandler<Input, Output> = {
  type: "schedule_human_call",
  dependencies: [{ kind: "afterScoped", taskType: "voice_call" }],
  resolveInput: (ctx) => {
    const contact = ctx.requireScopedContact() as ContactOutput["contacts"][number];
    const voiceCall = ctx.getTaskOutput("voice_call", ctx.scope ?? undefined) as { status: string };
    return { contact, voiceCallStatus: voiceCall.status };
  },
  execute: async (input) => {
    // TODO: integrate with calendar scheduling (Calendly, Cal.com, etc.)
    if (input.voiceCallStatus === "completed") {
      return { scheduled: true };
    }
    return { scheduled: false, reason: `Voice call status: ${input.voiceCallStatus}` };
  },
};
