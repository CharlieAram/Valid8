import { Hono } from "hono";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "../db/index.js";
import {
  createWorkflow,
  completeHumanTask,
} from "../engine/scheduler.js";
import { generateIdeaConfirmation } from "../services/ai.js";
import type {
  WorkflowView,
  TaskView,
  TaskStatus,
  CreateWorkflowRequest,
  ConfirmIdeaRequest,
} from "@valid8/shared";

type TaskRow = typeof schema.tasks.$inferSelect;

function toTaskView(t: TaskRow): TaskView {
  return {
    id: t.id,
    type: t.type as TaskView["type"],
    status: t.status as TaskStatus,
    scope: t.scopeJson ? JSON.parse(t.scopeJson) : null,
    output: t.outputJson ? JSON.parse(t.outputJson) : null,
    startedAt: t.startedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
  };
}

function deriveStatus(tasks: TaskView[]): WorkflowView["status"] {
  if (tasks.length === 0) return "running";
  if (tasks.some((t) => t.status === "waiting_for_input")) return "waiting_for_input";
  const hasActive = tasks.some((t) =>
    t.status === "running" || t.status === "ready" || t.status === "pending"
  );
  if (hasActive) return "running";
  const pivotDone = tasks.some((t) => t.type === "pivot_proposals" && t.status === "completed");
  const resultsDone = tasks.some((t) => t.type === "results_summary" && t.status === "completed");
  if (pivotDone || resultsDone) return "completed";
  if (tasks.every((t) => t.status === "completed" || t.status === "skipped")) return "completed";
  if (tasks.some((t) => t.status === "failed")) return "failed";
  return "running";
}

function toWorkflowView(
  w: typeof schema.workflows.$inferSelect,
  taskRows: TaskRow[]
): WorkflowView {
  const tasks = taskRows.map(toTaskView);
  const completed = tasks.filter((t) => t.status === "completed" || t.status === "skipped").length;
  return {
    id: w.id,
    ideaText: w.ideaText,
    createdAt: w.createdAt.toISOString(),
    status: deriveStatus(tasks),
    tasks,
    progress: { completed, total: tasks.length },
  };
}

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json<CreateWorkflowRequest>();
  if (!body.ideaText?.trim()) {
    return c.json({ error: "ideaText is required" }, 400);
  }

  const workflowId = await createWorkflow(body.ideaText);
  const confirmation = await generateIdeaConfirmation(body.ideaText);

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.workflowId, workflowId));

  if (task) {
    await db
      .update(schema.tasks)
      .set({ outputJson: JSON.stringify(confirmation) })
      .where(eq(schema.tasks.id, task.id));
  }

  return c.json({ id: workflowId, confirmation }, 201);
});

app.get("/:id", async (c) => {
  const workflowId = c.req.param("id");

  const [workflow] = await db
    .select()
    .from(schema.workflows)
    .where(eq(schema.workflows.id, workflowId));

  if (!workflow) return c.json({ error: "Workflow not found" }, 404);

  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.workflowId, workflowId));

  return c.json(toWorkflowView(workflow, tasks));
});

app.get("/", async (c) => {
  const allWorkflows = await db.select().from(schema.workflows);
  const allTasks = await db.select().from(schema.tasks);

  const views = allWorkflows.map((w) =>
    toWorkflowView(w, allTasks.filter((t) => t.workflowId === w.id))
  );

  return c.json(views);
});

app.post("/:id/confirm", async (c) => {
  const workflowId = c.req.param("id");
  const body = await c.req.json<ConfirmIdeaRequest>();

  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.workflowId, workflowId));

  const confirmTask = tasks.find(
    (t) => t.type === "idea_confirmation" && t.status === "waiting_for_input"
  );

  if (!confirmTask) {
    return c.json({ error: "No pending confirmation for this workflow" }, 400);
  }

  let output = confirmTask.outputJson ? JSON.parse(confirmTask.outputJson) : {};
  if (!body.confirmed && body.revisedIdea) {
    output = await generateIdeaConfirmation(body.revisedIdea);
    await db
      .update(schema.workflows)
      .set({ ideaText: body.revisedIdea })
      .where(eq(schema.workflows.id, workflowId));
    await db
      .update(schema.tasks)
      .set({ outputJson: JSON.stringify(output) })
      .where(eq(schema.tasks.id, confirmTask.id));
    return c.json({ status: "revised", confirmation: output });
  }

  await completeHumanTask(confirmTask.id, output);
  return c.json({ status: "confirmed" });
});

// Add contacts manually to a workflow (before contact_discovery runs)
app.post("/:id/contacts", async (c) => {
  const workflowId = c.req.param("id");
  const body = await c.req.json<{
    contacts: Array<{ name: string; email: string; company: string; role: string }>;
  }>();

  if (!body.contacts?.length) {
    return c.json({ error: "contacts array is required" }, 400);
  }

  const inserted = body.contacts.map((contact) => ({
    id: nanoid(),
    workflowId,
    name: contact.name,
    email: contact.email,
    company: contact.company,
    role: contact.role,
  }));
  await db.insert(schema.contacts).values(inserted);

  return c.json({ contacts: inserted }, 201);
});

// Get contacts for a workflow
app.get("/:id/contacts", async (c) => {
  const workflowId = c.req.param("id");
  const contacts = await db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.workflowId, workflowId));
  return c.json(contacts);
});

// Delete a workflow and all associated data
app.delete("/:id", async (c) => {
  const workflowId = c.req.param("id");

  // Delete in order respecting foreign keys
  const variants = await db
    .select({ id: schema.landingPageVariants.id })
    .from(schema.landingPageVariants)
    .where(eq(schema.landingPageVariants.workflowId, workflowId));

  const variantIds = variants.map((v) => v.id);
  if (variantIds.length > 0) {
    await db.delete(schema.pageEvents).where(inArray(schema.pageEvents.variantId, variantIds));
  }
  await db.delete(schema.landingPageVariants).where(eq(schema.landingPageVariants.workflowId, workflowId));
  await db.delete(schema.landingPages).where(eq(schema.landingPages.workflowId, workflowId));
  await db.delete(schema.contacts).where(eq(schema.contacts.workflowId, workflowId));
  await db.delete(schema.personas).where(eq(schema.personas.workflowId, workflowId));
  await db.delete(schema.tasks).where(eq(schema.tasks.workflowId, workflowId));
  await db.delete(schema.workflows).where(eq(schema.workflows.id, workflowId));

  return c.json({ ok: true });
});

app.get("/:id/results", async (c) => {
  const workflowId = c.req.param("id");

  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.workflowId, workflowId));

  const summaryTask = tasks.find(
    (t) => t.type === "results_summary" && t.status === "completed"
  );

  if (!summaryTask?.outputJson) {
    return c.json({ error: "Results not yet available" }, 404);
  }

  return c.json(JSON.parse(summaryTask.outputJson));
});

export default app;
