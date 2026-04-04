import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db, schema } from "../db/index.js";

const app = new Hono();

// Landing page event ingestion
app.post("/page-events", async (c) => {
  const body = await c.req.json<{
    variantId: string;
    eventType: string;
    metadata?: Record<string, unknown>;
  }>();

  if (!body.variantId || !body.eventType) {
    return c.json({ error: "variantId and eventType are required" }, 400);
  }

  await db.insert(schema.pageEvents).values({
    id: nanoid(),
    variantId: body.variantId,
    eventType: body.eventType,
    metadataJson: body.metadata ? JSON.stringify(body.metadata) : null,
  });

  return c.json({ ok: true }, 201);
});

export default app;
