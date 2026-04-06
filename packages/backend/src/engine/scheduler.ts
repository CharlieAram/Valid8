import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { getHandler } from "./registry.js";
import type { TaskContext, Dependency } from "./types.js";
import type { TaskType, TaskStatus, ContactOutput } from "@valid8/shared";
import { nanoid } from "nanoid";

/**
 * Max tasks running at once **per workflow** (not global). When many contacts fan out,
 * personalize_page / send_email / etc. run in parallel up to this cap, then the rest wait.
 * Increase if your APIs tolerate more simultaneous calls.
 */
const MAX_CONCURRENT = 3;

interface TaskRow {
  id: string;
  workflowId: string;
  type: string;
  status: string;
  scopeJson: string | null;
  inputJson: string | null;
  outputJson: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

function parseScope(scopeJson: string | null): Record<string, string> | null {
  if (!scopeJson) return null;
  return JSON.parse(scopeJson);
}

function scopesMatch(
  a: Record<string, string> | null,
  b: Record<string, string> | null
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

const TERMINAL = new Set(["completed", "failed", "skipped"]);

function isDependencyMet(
  dep: Dependency,
  task: TaskRow,
  allTasks: TaskRow[]
): boolean {
  const scope = parseScope(task.scopeJson);

  switch (dep.kind) {
    case "after":
      return allTasks.some(
        (t) => t.type === dep.taskType && t.status === "completed"
      );

    case "afterScoped":
      return allTasks.some(
        (t) =>
          t.type === dep.taskType &&
          TERMINAL.has(t.status) &&
          scopesMatch(parseScope(t.scopeJson), scope)
      );

    case "afterAll": {
      const tasksOfType = allTasks.filter((t) => t.type === dep.taskType);
      if (tasksOfType.length === 0) return false;
      return tasksOfType.every((t) => TERMINAL.has(t.status));
    }
  }
}

function hasScopedDepFailed(
  deps: Dependency[],
  task: TaskRow,
  allTasks: TaskRow[]
): boolean {
  const scope = parseScope(task.scopeJson);
  return deps.some((dep) => {
    if (dep.kind !== "afterScoped") return false;
    return allTasks.some(
      (t) =>
        t.type === dep.taskType &&
        (t.status === "failed" || t.status === "skipped") &&
        scopesMatch(parseScope(t.scopeJson), scope)
    );
  });
}

export async function evaluate(workflowId: string): Promise<void> {
  const allTasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.workflowId, workflowId));

  const pendingTasks = allTasks.filter((t) => t.status === "pending");
  const currentRunning = allTasks.filter(
    (t) => t.status === "running" || t.status === "ready"
  ).length;

  let launched = 0;

  for (const task of pendingTasks) {
    const handler = getHandler(task.type as TaskType);

    // If a scoped dependency failed, skip this task
    if (hasScopedDepFailed(handler.dependencies, task, allTasks)) {
      await db
        .update(schema.tasks)
        .set({
          status: "skipped" as TaskStatus,
          outputJson: JSON.stringify({ skipped: true, reason: "dependency failed" }),
          completedAt: new Date(),
        })
        .where(eq(schema.tasks.id, task.id));
      continue;
    }

    if (currentRunning + launched >= MAX_CONCURRENT) break;

    const allMet = handler.dependencies.every((dep) =>
      isDependencyMet(dep, task, allTasks)
    );

    if (allMet) {
      launched++;
      await db
        .update(schema.tasks)
        .set({ status: "ready" as TaskStatus })
        .where(eq(schema.tasks.id, task.id));

      executeTask(task, allTasks, workflowId).catch((err) => {
        console.error(`Task ${task.id} (${task.type}) failed:`, err);
      });
    }
  }
}

function buildContext(
  task: TaskRow,
  allTasks: TaskRow[],
  workflowId: string,
  spawnedTasks: Array<{ type: TaskType; scope?: Record<string, string> }>
): TaskContext {
  const scope = parseScope(task.scopeJson);

  return {
    workflowId,
    taskId: task.id,
    scope,
    spawn: (type, s) => {
      spawnedTasks.push({ type, scope: s });
    },
    getTaskOutput: (taskType, s) => {
      const found = allTasks.find((t) => {
        if (t.type !== taskType || t.status !== "completed") return false;
        if (s) return scopesMatch(parseScope(t.scopeJson), s);
        return true;
      });
      return found?.outputJson ? JSON.parse(found.outputJson) : null;
    },
    requireScopedContact: () => {
      const discovery = allTasks.find(
        (t) => t.type === "contact_discovery" && t.status === "completed"
      );
      if (!discovery?.outputJson) throw new Error("contact_discovery not completed");
      const output = JSON.parse(discovery.outputJson) as ContactOutput;
      const contact = output.contacts.find((c) => c.id === scope?.contactId);
      if (!contact) throw new Error(`Contact not found: ${scope?.contactId}`);
      return contact;
    },
  };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function executeTask(
  task: TaskRow,
  allTasks: TaskRow[],
  workflowId: string
): Promise<void> {
  const handler = getHandler(task.type as TaskType);
  const spawnedTasks: Array<{ type: TaskType; scope?: Record<string, string> }> = [];
  const ctx = buildContext(task, allTasks, workflowId, spawnedTasks);

  await db
    .update(schema.tasks)
    .set({ status: "running" as TaskStatus, startedAt: new Date() })
    .where(eq(schema.tasks.id, task.id));

  console.log(
    `[Valid8] task run start: ${task.type} taskId=${task.id} workflow=${workflowId}` +
      (task.scopeJson ? ` scope=${task.scopeJson}` : "")
  );

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`Retrying ${task.type} (attempt ${attempt + 1}) after ${delay}ms...`);
        await sleep(delay);
      }

      const input = handler.resolveInput(ctx);
      const TASK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
      const output = await Promise.race([
        handler.execute(input, ctx),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Task ${task.type} timed out after 5 minutes`)), TASK_TIMEOUT)
        ),
      ]);

      await db
        .update(schema.tasks)
        .set({
          status: "completed" as TaskStatus,
          outputJson: JSON.stringify(output),
          completedAt: new Date(),
        })
        .where(eq(schema.tasks.id, task.id));

      console.log(`[Valid8] task done: ${task.type} taskId=${task.id} workflow=${workflowId}`);

      if (spawnedTasks.length > 0) {
        let rows: Array<{
          id: string;
          workflowId: string;
          type: TaskType;
          status: TaskStatus;
          scopeJson: string | null;
        }>;
        try {
          rows = spawnedTasks.map((s) => ({
            id: nanoid(),
            workflowId,
            type: s.type,
            status: getHandler(s.type).initialStatus ?? "pending",
            scopeJson: s.scope ? JSON.stringify(s.scope) : null,
          }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(
            `Spawn failed after ${task.type}: ${msg}. (Is every spawned task type registered in registerAllHandlers?)`
          );
        }
        await db.insert(schema.tasks).values(rows);
      }

      await evaluate(workflowId);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable = lastError.message.includes("rate limit") ||
        lastError.message.includes("429") ||
        lastError.message.includes("overloaded");
      if (!isRetryable) break;
    }
  }

  await db
    .update(schema.tasks)
    .set({
      status: "failed" as TaskStatus,
      outputJson: JSON.stringify({
        error: lastError?.message ?? "Unknown error",
      }),
      completedAt: new Date(),
    })
    .where(eq(schema.tasks.id, task.id));

  console.error(
    `[Valid8] task failed: ${task.type} taskId=${task.id} workflow=${workflowId}`,
    lastError?.message ?? lastError
  );

  // Even on failure, re-evaluate so other pending tasks can proceed
  await evaluate(workflowId);
}

export async function recoverStaleTasks(): Promise<void> {
  const staleTasks = await db
    .select()
    .from(schema.tasks)
    .where(inArray(schema.tasks.status, ["running", "ready"]));

  if (staleTasks.length === 0) return;

  console.log(`Recovering ${staleTasks.length} stale tasks...`);

  const staleIds = staleTasks.map((t) => t.id);
  await db
    .update(schema.tasks)
    .set({ status: "pending" as TaskStatus, startedAt: null })
    .where(inArray(schema.tasks.id, staleIds));

  const workflowIds = new Set(staleTasks.map((t) => t.workflowId));

  // Re-evaluate each affected workflow
  for (const wid of workflowIds) {
    await evaluate(wid);
  }
}

export async function createWorkflow(ideaText: string): Promise<string> {
  const workflowId = nanoid();

  await db.insert(schema.workflows).values({
    id: workflowId,
    ideaText,
  });

  await db.insert(schema.tasks).values({
    id: nanoid(),
    workflowId,
    type: "idea_confirmation",
    status: "waiting_for_input",
    inputJson: JSON.stringify({ ideaText }),
  });

  return workflowId;
}

export async function completeHumanTask(
  taskId: string,
  output: unknown
): Promise<void> {
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!task || task.status !== "waiting_for_input") {
    throw new Error(`Task ${taskId} is not waiting for input`);
  }

  await db
    .update(schema.tasks)
    .set({
      status: "completed" as TaskStatus,
      outputJson: JSON.stringify(output),
      completedAt: new Date(),
    })
    .where(eq(schema.tasks.id, taskId));

  await seedWorkflowTasks(task.workflowId);
  await evaluate(task.workflowId);
}

async function seedWorkflowTasks(workflowId: string): Promise<void> {
  const staticTypes: TaskType[] = [
    "market_research",
    "base_landing_page",
    "assumption_generation",
    "persona_identification",
    "contact_discovery",
    "results_summary",
    "pivot_proposals",
  ];

  const existing = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.workflowId, workflowId));

  const existingTypes = new Set(existing.map((t) => t.type));
  const toInsert = staticTypes.filter((t) => !existingTypes.has(t));

  if (toInsert.length > 0) {
    await db.insert(schema.tasks).values(
      toInsert.map((type) => ({
        id: nanoid(),
        workflowId,
        type,
        status: "pending",
      }))
    );
  }
}
