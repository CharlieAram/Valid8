import { Hono } from "hono";
import { eq } from "drizzle-orm";
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
  if (tasks.some((t) => t.status === "failed")) return "failed";
  if (tasks.every((t) => t.status === "completed")) return "completed";
  return "running";
}

function toWorkflowView(
  w: typeof schema.workflows.$inferSelect,
  taskRows: TaskRow[]
): WorkflowView {
  const tasks = taskRows.map(toTaskView);
  const completed = tasks.filter((t) => t.status === "completed").length;
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
