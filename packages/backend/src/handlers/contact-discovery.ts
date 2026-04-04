import type { TaskHandler } from "../engine/types.js";
import type { PersonaOutput, ContactOutput, IdeaConfirmationOutput } from "@valid8/shared";
import { generateContacts } from "../services/ai.js";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

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
      .where(
        eq(schema.contacts.workflowId, ctx.workflowId)
      );

    if (existingContacts.length > 0) {
      // Use manually added contacts
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
      // Generate synthetic contacts via AI (2 per persona)
      for (const persona of input.personas.personas) {
        const generated = await generateContacts(persona, input.idea, 2);
        for (const g of generated) {
          const contactId = nanoid();
          contacts.push({
            id: contactId,
            name: g.name,
            email: g.email,
            company: g.company,
            role: g.role,
            personaId: persona.id,
            linkedinUrl: g.linkedinUrl,
          });

          // Store in DB (no personaId FK — personas live in task output only)
          await db.insert(schema.contacts).values({
            id: contactId,
            workflowId: ctx.workflowId,
            name: g.name,
            email: g.email,
            company: g.company,
            role: g.role,
            linkedinUrl: g.linkedinUrl ?? null,
          });
        }
      }
    }

    // Spawn per-contact outreach tasks
    for (const contact of contacts) {
      const scope = { contactId: contact.id };
      ctx.spawn("personalize_page", scope);
      ctx.spawn("send_email", scope);
      ctx.spawn("voice_call", scope);
      ctx.spawn("schedule_human_call", scope);
    }

    return { contacts };
  },
};
