import type { TaskType } from "@valid8/shared";
import type { TaskHandler } from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers = new Map<TaskType, TaskHandler<any, any>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerHandler(handler: TaskHandler<any, any>) {
  handlers.set(handler.type, handler);
}

export function getHandler(type: TaskType): TaskHandler {
  const handler = handlers.get(type);
  if (!handler) throw new Error(`No handler registered for task type: ${type}`);
  return handler;
}

export function getAllHandlers(): TaskHandler[] {
  return Array.from(handlers.values());
}
