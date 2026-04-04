import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const dbPath = process.env.DATABASE_PATH ?? "valid8.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Auto-create tables on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    idea_text TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id),
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    scope_json TEXT,
    input_json TEXT,
    output_json TEXT,
    started_at INTEGER,
    completed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    jobs_to_be_done TEXT NOT NULL,
    pain_points TEXT NOT NULL,
    companies TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id),
    persona_id TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    linkedin_url TEXT
  );
  CREATE TABLE IF NOT EXISTS landing_pages (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id),
    html TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS landing_page_variants (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id),
    contact_id TEXT,
    base_page_id TEXT REFERENCES landing_pages(id),
    html TEXT NOT NULL,
    url TEXT NOT NULL,
    personalization_json TEXT
  );
  CREATE TABLE IF NOT EXISTS page_events (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL REFERENCES landing_page_variants(id),
    event_type TEXT NOT NULL,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
    metadata_json TEXT
  );
`);

export const db = drizzle(sqlite, { schema });
export { schema };
