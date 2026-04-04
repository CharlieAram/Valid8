import { registerHandler } from "../engine/registry.js";
import { ideaConfirmationHandler } from "./idea-confirmation.js";
import { marketResearchHandler } from "./market-research.js";
import { baseLandingPageHandler } from "./base-landing-page.js";
import { assumptionGenerationHandler } from "./assumption-generation.js";
import { personaIdentificationHandler } from "./persona-identification.js";
import { contactDiscoveryHandler } from "./contact-discovery.js";
import { personalizePageHandler } from "./personalize-page.js";
import { sendEmailHandler } from "./send-email.js";
import { voiceCallHandler } from "./voice-call.js";
import { scheduleHumanCallHandler } from "./schedule-human-call.js";
import { resultsSummaryHandler } from "./results-summary.js";

export function registerAllHandlers() {
  registerHandler(ideaConfirmationHandler);
  registerHandler(marketResearchHandler);
  registerHandler(baseLandingPageHandler);
  registerHandler(assumptionGenerationHandler);
  registerHandler(personaIdentificationHandler);
  registerHandler(contactDiscoveryHandler);
  registerHandler(personalizePageHandler);
  registerHandler(sendEmailHandler);
  registerHandler(voiceCallHandler);
  registerHandler(scheduleHumanCallHandler);
  registerHandler(resultsSummaryHandler);
}
