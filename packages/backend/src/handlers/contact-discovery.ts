import type { TaskHandler } from "../engine/types.js";
import type { PersonaOutput, ContactOutput } from "@valid8/shared";
import { nanoid } from "nanoid";

export const contactDiscoveryHandler: TaskHandler<PersonaOutput, ContactOutput> = {
  type: "contact_discovery",
  dependencies: [{ kind: "after", taskType: "persona_identification" }],
  resolveInput: (ctx) => {
    return ctx.getTaskOutput("persona_identification") as PersonaOutput;
  },
  execute: async (input, ctx) => {
    // TODO: Real contact discovery via LinkedIn, Apollo, etc.
    const contacts: ContactOutput["contacts"] = [];

    for (const persona of input.personas) {
      const contactId = nanoid();
      contacts.push({
        id: contactId,
        name: `Contact for ${persona.title}`,
        email: `placeholder@example.com`,
        company: persona.companies[0] ?? "Unknown Co",
        role: persona.title,
        personaId: persona.id,
      });

      const scope = { contactId };
      ctx.spawn("send_email", scope);
      ctx.spawn("voice_call", scope);
      ctx.spawn("schedule_human_call", scope);
    }

    return { contacts };
  },
};
