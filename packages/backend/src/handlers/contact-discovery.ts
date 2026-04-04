import type { TaskHandler } from "../engine/types.js";
import type { PersonaOutput, ContactOutput, IdeaConfirmationOutput } from "@valid8/shared";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { enrichContactChannels } from "../services/contact-enrichment.js";

interface Input {
  idea: string;
  personas: PersonaOutput;
}

export const contactDiscoveryHandler: TaskHandler<Input, ContactOutput> = {
  type: "contact_discovery",
  dependencies: [{ kind: "after", taskType: "persona_identification" }],
  resolveInput: (ctx) => {
    const confirmation = ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
    return {
      idea: confirmation.summary,
      personas: ctx.getTaskOutput("persona_identification") as PersonaOutput,
    };
  },
  execute: async (input, ctx) => {
    const contacts: ContactOutput["contacts"] = [];

    // Check if manual contacts were already added to the DB
    const existingContacts = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.workflowId, ctx.workflowId));

    if (existingContacts.length > 0) {
      for (const c of existingContacts) {
        contacts.push({
          id: c.id,
          name: c.name,
          email: c.email,
          company: c.company,
          role: c.role,
          personaId: c.personaId ?? input.personas.personas[0]?.id ?? "",
          linkedinUrl: c.linkedinUrl ?? undefined,
        });
      }
    } else {
      // Use Tavily to find real people matching each persona
      for (let i = 0; i < input.personas.personas.length; i++) {
        const persona = input.personas.personas[i];
        const company = persona.companies[0] ?? "Unknown Co";

        const discovery = await enrichContactChannels(
          { personaTitle: persona.title, company },
          i
        );

        const contactId = nanoid();
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
      }

      // Batch insert all contacts
      if (contacts.length > 0) {
        await db.insert(schema.contacts).values(
          contacts.map((c) => ({
            id: c.id,
            workflowId: ctx.workflowId,
            name: c.name,
            email: c.email,
            company: c.company,
            role: c.role,
            linkedinUrl: c.linkedinUrl ?? null,
          }))
        );
      }
    }

    // Spawn per-contact outreach tasks
    for (const contact of contacts) {
      const scope = { contactId: contact.id };
      ctx.spawn("send_email", scope);
      ctx.spawn("voice_call", scope);
      ctx.spawn("schedule_human_call", scope);
    }

    return { contacts };
  },
};
