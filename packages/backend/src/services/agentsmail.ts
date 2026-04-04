// Agentsmail integration — sends personalized outreach emails
// TODO: Replace with real Agentsmail SDK

export interface SendEmailParams {
  to: string;
  toName: string;
  subject: string;
  body: string;
  landingPageUrl: string;
}

export interface SendEmailResult {
  messageId: string;
  status: "sent" | "failed";
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  console.log(`[Agentsmail] Sending email to ${params.to}: ${params.subject}`);

  // TODO: real implementation
  return {
    messageId: `msg_${Date.now()}`,
    status: "sent",
  };
}
