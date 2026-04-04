import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

const app = new Hono();

app.post("/tts", async (c) => {
  const { text } = await c.req.json<{ text: string }>();
  if (!text?.trim()) return c.json({ error: "text is required" }, 400);

  if (!ELEVENLABS_API_KEY) return c.json({ fallback: true }, 200);

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
      console.error(`[ElevenLabs] TTS ${res.status}: ${await res.text()}`);
      return c.json({ fallback: true }, 200);
    }

    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("[ElevenLabs] TTS failed:", err);
    return c.json({ fallback: true }, 200);
  }
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
  const idea = ideaTask?.outputJson ? JSON.parse(ideaTask.outputJson) : null;

  const problem = idea?.targetMarket ?? "your industry";
  const solution = idea?.valueProposition ?? "our solution";

  return c.json({
    contactId: contact.id,
    contactName: contact.name,
    company: contact.company,
    role: contact.role,
    ideaSummary: idea?.summary ?? workflow.ideaText,
    greeting: `Hello ${contact.name}, thank you for agreeing to this interview. We wanted to ask you a few quick questions to gauge your potential fit for our solution.`,
    questions: [
      `What are the three biggest problems you face in your role at ${contact.company}?`,
      `Do you have a problem with ${problem}?`,
      `How much, in dollars per year, is that problem worth to you?`,
      `Why hasn't this problem been solved before?`,
      `Our solution is ${solution}. Does that sound like it would work for you, and why or why not?`,
      `Would you be open to arranging a sales call to purchase our solution?`,
    ],
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
          transcript: r
            .map((x) => `Q: ${x.question}\nA: ${x.answer}`)
            .join("\n\n"),
        }),
        completedAt: new Date(),
      })
      .where(eq(schema.tasks.id, callTask.id));
  }

  return c.json({ ok: true });
});

export default app;
