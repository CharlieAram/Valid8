import type { TaskHandler } from "../engine/types.js";
import { generateResultsSummary } from "../services/ai.js";
import type { IdeaConfirmationOutput, ResultsSummaryOutput } from "@valid8/shared";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export const resultsSummaryHandler: TaskHandler<Record<string, unknown>, ResultsSummaryOutput> = {
  type: "results_summary",
  dependencies: [{ kind: "afterAll", taskType: "schedule_human_call" }],
  resolveInput: (ctx) => {
    return {
      idea: ctx.getTaskOutput("idea_confirmation"),
      research: ctx.getTaskOutput("market_research"),
      assumptions: ctx.getTaskOutput("assumption_generation"),
      personas: ctx.getTaskOutput("persona_identification"),
      contacts: ctx.getTaskOutput("contact_discovery"),
    };
  },
  execute: async (inputs, ctx) => {
    const idea = inputs.idea as IdeaConfirmationOutput;

    // Collect real metrics from the database
    const allTasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.workflowId, ctx.workflowId));

    // Count email outcomes
    const emailTasks = allTasks.filter((t) => t.type === "send_email" && t.status === "completed");
    const emailsSent = emailTasks.length;

    // Count voice call outcomes
    const callTasks = allTasks.filter((t) => t.type === "voice_call" && t.status === "completed");
    const callsCompleted = callTasks.filter((t) => {
      const output = t.outputJson ? JSON.parse(t.outputJson) : {};
      return output.status === "completed";
    }).length;

    // Count scheduled calls
    const scheduleTasks = allTasks.filter((t) => t.type === "schedule_human_call" && t.status === "completed");
    const callsScheduled = scheduleTasks.filter((t) => {
      const output = t.outputJson ? JSON.parse(t.outputJson) : {};
      return output.scheduled === true;
    }).length;

    // Collect page events in a single query
    const variants = await db
      .select({ id: schema.landingPageVariants.id })
      .from(schema.landingPageVariants)
      .where(eq(schema.landingPageVariants.workflowId, ctx.workflowId));

    const variantIds = variants.map((v) => v.id);
    let pageVisits = 0;
    let signups = 0;
    if (variantIds.length > 0) {
      const events = await db
        .select()
        .from(schema.pageEvents)
        .where(inArray(schema.pageEvents.variantId, variantIds));
      pageVisits = events.filter((e) => e.eventType === "visit").length;
      signups = events.filter((e) => e.eventType === "signup").length;
    }

    // Build enriched data for AI analysis
    const metrics = {
      emailsSent,
      pageVisits,
      signups,
      callsCompleted,
      callsScheduled,
    };

    // Collect all task outputs for qualitative analysis
    const taskOutputs: Record<string, unknown[]> = {};
    for (const t of allTasks) {
      if (t.outputJson && t.status === "completed") {
        if (!taskOutputs[t.type]) taskOutputs[t.type] = [];
        taskOutputs[t.type].push(JSON.parse(t.outputJson));
      }
    }

    return generateResultsSummary(idea.summary, {
      ...inputs,
      metrics,
      taskOutputs,
    });
  },
};
