import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const workflows = sqliteTable("workflows", {
  id: text("id").primaryKey(),
  ideaText: text("idea_text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  scopeJson: text("scope_json"), // JSON string, e.g. {"contactId":"abc"}
  inputJson: text("input_json"),
  outputJson: text("output_json"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const personas = sqliteTable("personas", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  jobsToBeDone: text("jobs_to_be_done").notNull(), // JSON array
  painPoints: text("pain_points").notNull(), // JSON array
  companies: text("companies").notNull(), // JSON array
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id),
  personaId: text("persona_id").references(() => personas.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  linkedinUrl: text("linkedin_url"),
});

export const landingPageVariants = sqliteTable("landing_page_variants", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id),
  contactId: text("contact_id").references(() => contacts.id),
  basePageId: text("base_page_id"),
  url: text("url").notNull(),
  personalizationJson: text("personalization_json"),
});

export const pageEvents = sqliteTable("page_events", {
  id: text("id").primaryKey(),
  variantId: text("variant_id")
    .notNull()
    .references(() => landingPageVariants.id),
  eventType: text("event_type").notNull(), // visit, click, signup
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  metadataJson: text("metadata_json"),
});
