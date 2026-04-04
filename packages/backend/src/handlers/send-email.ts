import type { TaskHandler } from "../engine/types.js";
import { sendEmail } from "../services/agentsmail.js";
import { generateOutreachEmail } from "../services/ai.js";
import type { ContactOutput, IdeaConfirmationOutput } from "@valid8/shared";

interface Input {
  workflowId: string;
  contact: ContactOutput["contacts"][number];
  pageUrl: string;
  idea: IdeaConfirmationOutput;
}

interface Output {
  messageId: string;
  inboxId: string;
  fromEmail: string;
  status: string;
  subject: string;
}

export const sendEmailHandler: TaskHandler<Input, Output> = {
  type: "send_email",
  dependencies: [{ kind: "after", taskType: "base_landing_page" }],
  resolveInput: (ctx) => {
    const contact = ctx.requireScopedContact() as ContactOutput["contacts"][number];
    const page = ctx.getTaskOutput("base_landing_page") as { url: string };
    const idea = ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
    return { workflowId: ctx.workflowId, contact, pageUrl: page.url, idea };
  },
  execute: async (input) => {
    const email = await generateOutreachEmail(
      { name: input.contact.name, company: input.contact.company, role: input.contact.role },
      input.idea,
      input.pageUrl
    );

    const result = await sendEmail({
      workflowId: input.workflowId,
      to: input.contact.email,
      toName: input.contact.name,
      subject: email.subject,
      body: email.body,
      html: email.html,
      landingPageUrl: input.pageUrl,
    });
    return {
      messageId: result.messageId,
      inboxId: result.inboxId,
      fromEmail: result.fromEmail,
      status: result.status,
      subject: email.subject,
    };
  },
};
