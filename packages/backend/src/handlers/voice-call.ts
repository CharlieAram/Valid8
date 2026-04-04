import type { TaskHandler } from "../engine/types.js";
import { makeVoiceCall } from "../services/elevenlabs.js";
import type { ContactOutput, IdeaConfirmationOutput } from "@valid8/shared";

interface Input {
  contact: ContactOutput["contacts"][number];
  idea: IdeaConfirmationOutput;
}

interface Output {
  callId: string;
  status: string;
  transcript?: string;
}

export const voiceCallHandler: TaskHandler<Input, Output> = {
  type: "voice_call",
  dependencies: [{ kind: "afterScoped", taskType: "send_email" }],
  resolveInput: (ctx) => {
    const contact = ctx.requireScopedContact() as ContactOutput["contacts"][number];
    const idea = ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
    return { contact, idea };
  },
  execute: async (input) => {
    const result = await makeVoiceCall({
      contactName: input.contact.name,
      contactCompany: input.contact.company,
      ideaSummary: input.idea.summary,
      talkingPoints: [
        `Did you get a chance to look at the landing page?`,
        `What are your biggest pain points around ${input.idea.targetMarket}?`,
        `Would you be open to a 15-minute call to discuss this further?`,
      ],
    });
    return { callId: result.callId, status: result.status, transcript: result.transcript };
  },
};
