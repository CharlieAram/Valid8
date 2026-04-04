# Valid8

Automated B2B idea validation. Describe a business idea, and Valid8 runs a full validation workflow: market research, assumption generation, persona identification, contact discovery, personalized outreach, and results analysis.

## How it works

1. You submit a business idea in plain text
2. The system confirms its understanding with you (human gate)
3. It kicks off market research and landing page generation in parallel
4. From the research, it generates testable assumptions and target personas
5. It discovers contacts matching those personas and runs personalized outreach per contact (email, voice call, scheduled call)
6. It collects landing page metrics and produces a validation summary

The workflow is a DAG, not a linear pipeline. Tasks declare dependencies and run as soon as their inputs are ready. Per-contact outreach fans out automatically.

## Stack

- **Backend**: TypeScript, Hono, SQLite (Drizzle ORM)
- **Frontend**: React, Tailwind CSS, Vite
- **AI**: Anthropic Claude via Vercel AI SDK
- **Email**: AgentMail
- **Landing pages**: InsForge
- **Monorepo**: pnpm workspaces

## Setup

```bash
pnpm install
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
AGENTMAIL_API_KEY=am_...
INSFORGE_BASE_URL=https://your-app.insforge.app
INSFORGE_ANON_KEY=your-anon-key
```

## Development

```bash
pnpm dev                      # run backend + frontend
pnpm --filter backend dev     # backend only (port 3000)
pnpm --filter frontend dev    # frontend only (port 5173)
pnpm --filter backend test    # run tests
pnpm db:push                  # push schema to SQLite
```

## API

- `POST /api/workflows` — create a workflow from idea text
- `GET /api/workflows/:id` — workflow status and task states
- `POST /api/workflows/:id/confirm` — confirm idea understanding
- `GET /api/workflows/:id/results` — validation results
- `POST /api/webhooks/page-events` — landing page event ingestion
