import type { ContactOutput, TaskStatus } from "@valid8/shared";

export interface ContactPipeline {
  contact: ContactOutput["contacts"][number];
  email: TaskStatus;
  phone: TaskStatus;
  paid: boolean;
}
