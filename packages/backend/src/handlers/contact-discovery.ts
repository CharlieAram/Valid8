import type { TaskHandler } from "../engine/types.js";
import type { PersonaOutput, ContactOutput } from "@valid8/shared";
import { nanoid } from "nanoid";
import { enrichContactChannels } from "../services/contact-enrichment.js";

export const contactDiscoveryHandler: TaskHandler<PersonaOutput, ContactOutput> = {
  type: "contact_discovery",
  dependencies: [{ kind: "after", taskType: "persona_identification" }],
  resolveInput: (ctx) => {
    return ctx.getTaskOutput("persona_identification") as PersonaOutput;
  },
  execute: async (input, ctx) => {
    const contacts: ContactOutput["contacts"] = [];

    for (let i = 0; i < input.personas.length; i++) {
      const persona = input.personas[i];
      const contactId = nanoid();
      const company = persona.companies[0] ?? "Unknown Co";

      const discovery = await enrichContactChannels(
        { personaTitle: persona.title, company },
        i
      );

      contacts.push({
        id: contactId,
        name: discovery.fullName,
        email: discovery.email ?? "placeholder@example.com",
        company,
        role: persona.title,
        personaId: persona.id,
        linkedinUrl: discovery.linkedinUrl,
        discovery,
      });

      const scope = { contactId };
      ctx.spawn("send_email", scope);
      ctx.spawn("voice_call", scope);
      ctx.spawn("schedule_human_call", scope);
    }

    return { contacts };
  },
};
