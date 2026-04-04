import { AgentMailClient } from "agentmail";

const client = new AgentMailClient({
  apiKey: process.env.AGENTMAIL_API_KEY!,
});

// Cache inbox per workflow to reuse across contacts
const workflowInboxes = new Map<string, string>();

export interface SendEmailParams {
  workflowId: string;
  to: string;
  toName: string;
  subject: string;
  body: string;
  html?: string;
  landingPageUrl: string;
}

export interface SendEmailResult {
  messageId: string;
  inboxId: string;
  fromEmail: string;
  status: "sent" | "failed";
}

async function getOrCreateInbox(workflowId: string): Promise<{ inboxId: string; email: string }> {
  const cached = workflowInboxes.get(workflowId);
  if (cached) {
    return { inboxId: cached, email: `${cached}@agentmail.to` };
  }

  // Try to find existing inbox by clientId first
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inboxes: any = await client.inboxes.list();
    const items = inboxes?.data ?? inboxes?.inboxes ?? [];
    const existing = items.find(
      (i: { clientId?: string }) => i.clientId === `valid8-${workflowId}`
    );
    if (existing) {
      workflowInboxes.set(workflowId, existing.inboxId);
      return { inboxId: existing.inboxId, email: `${existing.inboxId}@agentmail.to` };
    }
  } catch {
    // List might not be supported or fail, proceed to create
  }

  const inbox = await client.inboxes.create({
    displayName: "Valid8 Outreach",
    clientId: `valid8-${workflowId}`,
  });

  workflowInboxes.set(workflowId, inbox.inboxId);
  return { inboxId: inbox.inboxId, email: `${inbox.inboxId}@agentmail.to` };
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { inboxId, email: fromEmail } = await getOrCreateInbox(params.workflowId);

  const html = params.html ?? `
    <p>Hi ${params.toName},</p>
    <p>${params.body.replace(/\n/g, "<br>")}</p>
    <p><a href="${params.landingPageUrl}">Learn more</a></p>
  `.trim();

  const response = await client.inboxes.messages.send(inboxId, {
    to: params.to,
    subject: params.subject,
    text: params.body,
    html,
  });

  return {
    messageId: response.messageId,
    inboxId,
    fromEmail,
    status: "sent",
  };
}
