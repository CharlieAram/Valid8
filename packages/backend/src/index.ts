import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { registerAllHandlers } from "./handlers/index.js";
import { recoverStaleTasks } from "./engine/scheduler.js";
import workflowRoutes from "./routes/workflows.js";
import webhookRoutes from "./routes/webhooks.js";
import pageRoutes from "./routes/pages.js";

// Register all task handlers before starting
registerAllHandlers();

// Recover any tasks that were running when the server last stopped
recoverStaleTasks().catch((err) =>
  console.error("Failed to recover stale tasks:", err)
);

const app = new Hono();

app.use("/*", cors());

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

app.route("/api/workflows", workflowRoutes);
app.route("/api/webhooks", webhookRoutes);
app.route("/p", pageRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT) || 3000;
console.log(`Valid8 backend running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
