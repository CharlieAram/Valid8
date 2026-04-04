# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Valid8 Is

B2B Idea Validation Platform. A platform that lets you run automated validation workflows for B2B software business ideas. You can have multiple workflows running in parallel, each testing a different idea.

### Workflow

The workflow starts when you describe your business idea in plain text. The AI confirms its understanding of the idea with you before proceeding, just a quick sanity check.

It then kicks off two things. First, deep market research via web search (similar to Claude Deep Research), gathering context on the market, competitors, and landscape. Second, in parallel, it generates a base landing page for the idea using Insforge.

From the market research, the system produces a set of testable assumptions following lean startup methodology: "What has to be true for this business to work?" These are the hypotheses the rest of the workflow tries to validate.

Next, it identifies target customer personas and jobs-to-be-done, then finds real contacts (people) matching those profiles. There's also a consideration around using synthetic personas for earlier/cheaper testing.

For each real contact, it runs a structured outreach sequence:

1. Send a personalized email (via Agentsmail) with a link to a personalized version of the landing page, tailored to that person
2. AI voice call (via ElevenLabs) to follow up
3. Schedule a real human-to-human call

Throughout all of this, collect landing page metrics (visits, clicks, sign-ups) to answer the core question: "Are they willing to pay?"

The workflow concludes with a direct summary of results, combining quantitative data (landing page conversion metrics) and qualitative insights (from conversations and responses). If anything surfaces during the process that suggests a more promising direction (e.g., a prospect mentions a different pain point that resonates more), the platform proposes alternative business ideas. You can spin up new validation workflows from those proposals, making the whole platform a living set of parallel validation experiments.

## Tech Stack

- **Backend**: TypeScript, Hono, SQLite (via Drizzle ORM)
- **Frontend**: React, Tailwind CSS, Vite
- **AI**: Anthropic Claude (via Vercel AI SDK + @ai-sdk/anthropic)
- **Email**: Agentsmail
- **Voice**: ElevenLabs
- **Landing pages**: Insforge
- **Web search**: TBD
- **Monorepo**: pnpm workspaces

## Commands

```bash
pnpm install                  # install all dependencies
pnpm dev                      # run backend + frontend concurrently
pnpm --filter backend dev     # backend only
pnpm --filter frontend dev    # frontend only
pnpm --filter backend test    # run backend tests
pnpm --filter backend test -- --grep "pattern"  # single test
pnpm db:push                  # push schema changes to SQLite
pnpm db:studio                # open Drizzle Studio
```

## Architecture

### Monorepo Layout

```
packages/
  backend/          # Hono API server
    src/
      routes/       # Hono route handlers
      workflows/    # workflow engine + step implementations
      services/     # external service integrations
      db/           # Drizzle schema + migrations
  frontend/         # React SPA
    src/
      pages/        # top-level views
      components/   # shared UI components
  shared/           # shared types and constants
```

### Core Domain: Task DAG Workflow Engine

A workflow is **not** a linear state machine. It's a DAG (directed acyclic graph) of tasks. Tasks declare their **dependencies**, not their position in a sequence. The engine resolves what can run based on what's completed.

#### Core Abstractions

**Workflow** — one idea validation run. Owns a collection of tasks. Its status is derived from its tasks' statuses (not stored independently).

**Task** — the unit of work. A row in the DB with:
- `type` — what kind of work (e.g., `market_research`, `send_email`)
- `status` — `pending | ready | running | completed | failed | waiting_for_input`
- `scope` — optional JSON scoping this task to an entity (e.g., `{ "contactId": "abc" }`)
- `input` / `output` — JSON blobs
- `workflow_id` — which workflow it belongs to

Tasks don't know about each other directly. They declare what they need, not what comes before them.

**Task Handler** — a registered implementation for a task type. Defines:
- `dependencies` — what must be true before this task can run
- `resolveInput` — how to build this task's input from dependency outputs
- `execute` — the actual work; returns output, can spawn new tasks

**Scheduler** — evaluates all `pending` tasks, checks if dependencies are satisfied, marks them `ready`, and executes them. Runs after any task completes or new tasks are spawned.

#### Dependency Model

Three dependency types cover every case:

| Type | Meaning | Example |
|------|---------|---------|
| `after` | A task type in this workflow completed | `assumption_generation` after `market_research` |
| `afterScoped` | A task type with the **same scope** completed | `send_email` after `personalize_page` (same contact) |
| `afterAll` | **All** tasks of a type in this workflow completed | `results_summary` after all `schedule_human_call` tasks |

```typescript
type Dependency =
  | { kind: 'after'; taskType: string }
  | { kind: 'afterScoped'; taskType: string }
  | { kind: 'afterAll'; taskType: string }
```

No event buses, no pub/sub, no reactive streams. Just rows in a table and a scheduler that checks conditions.

#### Fan-Out

When a task handler calls `ctx.spawn(type, scope)`, new task rows are created in `pending`. On the next scheduler pass, their dependencies are checked and they run when ready. Example: `contact_discovery` finds 20 contacts → spawns 20 sets of scoped outreach tasks, each progressing independently.

#### Human Gates

A task with status `waiting_for_input` blocks until the user provides input via the API (e.g., `idea_confirmation`). When input arrives, the task completes and the scheduler re-evaluates.

#### Metrics

Metrics are **not tasks**. They're events stored in `page_events` via a webhook endpoint. The `results_summary` task reads them when it runs.

#### The Valid8 Task Graph

```
idea_confirmation (human gate)
  ├──→ market_research ──→ assumption_generation ──→ persona_identification ──→ contact_discovery
  │                                                                              ↓ spawns per contact
  └──→ base_landing_page ──→ [personalize_page] ──→ [send_email] ──→ [voice_call] ──→ [schedule_human_call]
                              (scoped)              (scoped)        (scoped)         (scoped)
                                                                                          ↓
                                                                              results_summary (afterAll)
                                                                                          ↓
                                                                              pivot_proposals (optional)
```

`[]` = fan-out tasks, one per contact, each running independently.
`personalize_page` has two dependencies: `after: base_landing_page` AND `afterScoped: contact_discovery` — both must be satisfied.

#### Scheduler Loop (pseudocode)

```
function evaluate(workflowId):
  pendingTasks = db.tasks.where({ workflowId, status: 'pending' })
  for task in pendingTasks:
    handler = registry.get(task.type)
    if allDependenciesMet(handler.dependencies, task, workflowId):
      task.status = 'ready'
      enqueue(task)

function allDependenciesMet(deps, task, workflowId):
  for dep in deps:
    if dep.kind == 'after':
      if not exists completed task of dep.taskType in workflowId → false
    if dep.kind == 'afterScoped':
      if not exists completed task of dep.taskType with same scope → false
    if dep.kind == 'afterAll':
      if any task of dep.taskType in workflowId is not completed → false
  return true
```

### Key Design Decisions

- **Workflow engine is internal**, not a third-party orchestrator. No job queue yet — runs in-process. Add BullMQ or similar later if needed.
- **Each external service gets a thin adapter** in `services/` — Agentsmail, ElevenLabs, Insforge, web search. Adapters handle auth, retries, and rate limiting. Business logic stays in task handlers.
- **Landing pages are personalized per contact**. The base page is generated once (Insforge), then variants are created per outreach target. Each variant gets a unique trackable URL.
- **Metrics collection is event-driven**. Landing page events (visit, click, signup) are posted to a webhook endpoint and stored against the workflow + contact.
- **Frontend polls workflow status**. No WebSockets needed — workflows run over minutes/hours, not seconds.
- **Tasks are idempotent**. Use idempotency keys for external calls so a crashed task can be retried safely.

### Data Model (core tables)

- `workflows` — id, idea_text, created_at
- `tasks` — id, workflow_id, type, status, scope_json, input_json, output_json, started_at, completed_at
- `personas` — id, workflow_id, description, jobs_to_be_done
- `contacts` — id, workflow_id, persona_id, name, email, company, source
- `landing_page_variants` — id, workflow_id, contact_id, base_page_id, url, personalization_json
- `page_events` — id, variant_id, event_type, timestamp, metadata_json

### API Structure

All routes are prefixed `/api`. Key groups:

- `POST /api/workflows` — create new workflow from idea text
- `GET /api/workflows/:id` — workflow status + task states
- `POST /api/workflows/:id/confirm` — confirm idea understanding (completes the human gate task)
- `GET /api/workflows/:id/results` — final validation summary
- `POST /api/webhooks/page-events` — landing page event ingestion
