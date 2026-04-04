/**
 * Maps raw errors and internal IDs to copy suitable for the main UI.
 * Technical detail stays in the console.
 */

export function friendlyApiError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (m.includes("404") || m.includes("not found")) {
    return "We couldn't find what you're looking for. It may have been removed.";
  }
  if (m.includes("401") || m.includes("403") || m.includes("unauthorized")) {
    return "You don't have permission to do that. Try signing in again.";
  }
  if (m.includes("500") || m.includes("502") || m.includes("503") || m.includes("server")) {
    return "Something went wrong on our side. Please try again in a moment.";
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return "That took too long. Please try again.";
  }
  return "Something went wrong. If this keeps happening, contact support.";
}

/** Short label for a workflow task type — shown in the dashboard strip. */
export const TASK_FRIENDLY: Record<string, string> = {
  idea_confirmation: "Confirming your idea",
  market_research: "Researching the market",
  base_landing_page: "Building your landing page",
  assumption_generation: "Listing assumptions to test",
  persona_identification: "Defining who to talk to",
  contact_discovery: "Finding real contacts",
  personalize_page: "Personalizing pages for each contact",
  send_email: "Sending outreach emails",
  voice_call: "Running follow-up calls",
  schedule_human_call: "Scheduling conversations",
  results_summary: "Summarizing results",
  pivot_proposals: "Suggesting next ideas",
};

export function friendlyTaskLine(type: string): string {
  return TASK_FRIENDLY[type] ?? "Working on your validation";
}
