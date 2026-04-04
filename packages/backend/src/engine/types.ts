import type { TaskType } from "@valid8/shared";

export type Dependency =
  | { kind: "after"; taskType: TaskType }
  | { kind: "afterScoped"; taskType: TaskType }
  | { kind: "afterAll"; taskType: TaskType };

export interface TaskContext {
  workflowId: string;
  taskId: string;
  scope: Record<string, string> | null;
  spawn: (taskType: TaskType, scope?: Record<string, string>) => void;
  getTaskOutput: (taskType: TaskType, scope?: Record<string, string>) => unknown;
  requireScopedContact: () => { id: string; [key: string]: unknown };
}

export interface TaskHandler<TInput = unknown, TOutput = unknown> {
  type: TaskType;
  dependencies: Dependency[];
  initialStatus?: "pending" | "waiting_for_input";
  resolveInput: (ctx: TaskContext) => TInput;
  execute: (input: TInput, ctx: TaskContext) => Promise<TOutput>;
}
