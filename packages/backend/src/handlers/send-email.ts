import type { TaskHandler } from "../engine/types.js";
import { sendEmail } from "../services/agentsmail.js";
import type { ContactOutput, IdeaConfirmationOutput } from "@valid8/shared";

interface Input {
  contact: ContactOutput["contacts"][number];
  pageUrl: string;
  idea: IdeaConfirmationOutput;
}

interface Output {
  messageId: string;
  status: string;
}

export const sendEmailHandler: TaskHandler<Input, Output> = {
  type: "send_email",
  dependencies: [{ kind: "afterScoped", taskType: "personalize_page" }],
  resolveInput: (ctx) => {
    const contact = ctx.requireScopedContact() as ContactOutput["contacts"][number];
    const page = ctx.getTaskOutput("personalize_page", ctx.scope ?? undefined) as { url: string };
    const idea = ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
    return { contact, pageUrl: page.url, idea };
  },
  execute: async (input) => {
    const result = await sendEmail({
      to: input.contact.email,
      toName: input.contact.name,
      subject: `Quick question about ${input.idea.targetMarket}`,
      body: `Hi ${input.contact.name},\n\nI'm exploring a solution for ${input.idea.valueProposition}. Would love your perspective.\n\nCheck it out: ${input.pageUrl}`,
      landingPageUrl: input.pageUrl,
    });
    return { messageId: result.messageId, status: result.status };
  },
};
