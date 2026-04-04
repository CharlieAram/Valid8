import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "../db/index.js";
import { generatePersonalizedInterviewScript } from "../services/ai.js";
import type { IdeaConfirmationOutput } from "@valid8/shared";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_DISABLED =
  process.env.ELEVENLABS_DISABLED === "1" || process.env.ELEVENLABS_DISABLED === "true";

function fallbackInterviewScript(
  contact: { name: string; company: string },
  idea: IdeaConfirmationOutput | null,
  workflowIdeaText: string,
): { greeting: string; questions: string[] } {
  const problem = idea?.targetMarket ?? "your space";
  const solution = idea?.valueProposition ?? "our solution";
  return {
    greeting: `Hello ${contact.name}, thank you for agreeing to this interview. We wanted to ask you a few quick questions to gauge your potential fit for our solution.`,
    questions: [
      `What are the three biggest problems you face in your role at ${contact.company}?`,
      `In your work, do you run into the kinds of challenges we're focused on — especially around ${problem}?`,
      `How much, in dollars per year, would you estimate that problem costs you or your team?`,
      `Why do you think this problem has not been solved before?`,
      `We're building something that ${solution.slice(0, 200)}${solution.length > 200 ? "…" : ""} Does that sound like it could work for you, and why or why not?`,
      `Would you be open to a short follow-up call to explore purchasing if it is a fit?`,
    ],
  };
}

const app = new Hono();

app.post("/tts", async (c) => {
  const { text } = await c.req.json<{ text: string }>();
  if (!text?.trim()) return c.json({ error: "text is required" }, 400);

  if (ELEVENLABS_DISABLED || !ELEVENLABS_API_KEY) {
    return c.json({ fallback: true, reason: "disabled_or_no_key" }, 200);
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      const soft =
        res.status === 401 || res.status === 402 || res.status === 403 || res.status === 429;
      if (soft) {
        console.warn(
          `[ElevenLabs] TTS unavailable (${res.status}) — using browser speech. ${errBody.slice(0, 200)}`,
        );
      } else {
        console.error(`[ElevenLabs] TTS ${res.status}: ${errBody}`);
      }
      return c.json({ fallback: true, reason: "elevenlabs_error", status: res.status }, 200);
    }

    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("[ElevenLabs] TTS failed:", err);
    return c.json({ fallback: true, reason: "network" }, 200);
  }
});

/** List saved interview transcripts (newest first). */
app.get("/transcripts", async (c) => {
  const rows = await db
    .select({
      id: schema.callTranscripts.id,
      workflowId: schema.callTranscripts.workflowId,
      contactId: schema.callTranscripts.contactId,
      contactName: schema.callTranscripts.contactName,
      transcript: schema.callTranscripts.transcript,
      createdAt: schema.callTranscripts.createdAt,
      ideaText: schema.workflows.ideaText,
    })
    .from(schema.callTranscripts)
    .innerJoin(schema.workflows, eq(schema.callTranscripts.workflowId, schema.workflows.id))
    .orderBy(desc(schema.callTranscripts.createdAt));

  return c.json(
    rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

app.get("/session/:contactId", async (c) => {
  const contactId = c.req.param("contactId");

  const [contact] = await db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.id, contactId));
  if (!contact) return c.json({ error: "Contact not found" }, 404);

  const [workflow] = await db
    .select()
    .from(schema.workflows)
    .where(eq(schema.workflows.id, contact.workflowId));
  if (!workflow) return c.json({ error: "Workflow not found" }, 404);

  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.workflowId, contact.workflowId));

  const ideaTask = tasks.find(
    (t) => t.type === "idea_confirmation" && t.outputJson,
  );
  const idea = ideaTask?.outputJson
    ? (JSON.parse(ideaTask.outputJson) as IdeaConfirmationOutput)
    : null;

  let persona:
    | {
        title: string;
        description: string;
        jobsToBeDone: string[];
        painPoints: string[];
      }
    | null = null;
  if (contact.personaId) {
    const [p] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, contact.personaId));
    if (p) {
      try {
        persona = {
          title: p.title,
          description: p.description,
          jobsToBeDone: JSON.parse(p.jobsToBeDone) as string[],
          painPoints: JSON.parse(p.painPoints) as string[],
        };
      } catch {
        persona = {
          title: p.title,
          description: p.description,
          jobsToBeDone: [],
          painPoints: [],
        };
      }
    }
  }

  let script = fallbackInterviewScript(contact, idea, workflow.ideaText);
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      script = await generatePersonalizedInterviewScript({
        contactName: contact.name,
        contactRole: contact.role,
        contactCompany: contact.company,
        idea,
        workflowIdeaText: workflow.ideaText,
        persona,
      });
    }
  } catch (err) {
    console.warn("[call] Personalized script failed, using fallback:", err);
  }

  return c.json({
    contactId: contact.id,
    contactName: contact.name,
    company: contact.company,
    role: contact.role,
    ideaSummary: idea?.summary ?? workflow.ideaText,
    greeting: script.greeting,
    questions: script.questions,
  });
});

app.post("/session/:contactId/complete", async (c) => {
  const contactId = c.req.param("contactId");
  const body = await c.req.json<{
    responses: Array<{ question: string; answer: string }>;
  }>();

  console.log(`[Call] Interview completed for ${contactId}`);

  const [contact] = await db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.id, contactId));
  if (!contact) return c.json({ ok: true });

  const fullTranscript = body.responses
    .map((x) => `Q: ${x.question}\nA: ${x.answer}`)
    .join("\n\n");

  await db.insert(schema.callTranscripts).values({
    id: nanoid(),
    workflowId: contact.workflowId,
    contactId: contact.id,
    contactName: contact.name,
    transcript: fullTranscript,
  });

  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.workflowId, contact.workflowId));

  const callTask = tasks.find(
    (t) => t.type === "voice_call" && t.scopeJson?.includes(contactId),
  );

  if (callTask) {
    const r = body.responses;
    const topProblems =
      r[0]?.answer
        ?.split(/[,;.]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3) ?? [];
    const hasProblem = /yes|definitely|absolutely|sure/i.test(r[1]?.answer ?? "");
    const valMatch = r[2]?.answer?.match(/[\d,]+/);
    const problemValueUsd = valMatch
      ? parseInt(valMatch[0].replace(/,/g, "")) || null
      : null;
    const whyUnsolved = r[3]?.answer ?? "";
    const solAnswer = r[4]?.answer ?? "";
    const solutionPositive = /yes|great|work|interesting|love|definitely/i.test(solAnswer);
    const willingToTalk = /yes|sure|open|willing|absolutely/i.test(r[5]?.answer ?? "");

    await db
      .update(schema.tasks)
      .set({
        status: "completed",
        outputJson: JSON.stringify({
          callId: `call_${Date.now()}`,
          status: "completed",
          topProblems,
          hasProblem,
          problemValueUsd,
          whyUnsolved,
          solutionReaction: { positive: solutionPositive, comment: solAnswer },
          willingToTalk,
          transcript: fullTranscript,
        }),
        completedAt: new Date(),
      })
      .where(eq(schema.tasks.id, callTask.id));
  }

  return c.json({ ok: true });
});

export default app;
