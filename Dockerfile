FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared packages/shared
COPY packages/backend packages/backend
COPY packages/frontend packages/frontend

# Build frontend
RUN pnpm --filter frontend build

# Copy frontend build output to where the backend serves it
RUN cp -r packages/frontend/dist packages/backend/public

# Push DB schema (creates tables on first run via entrypoint instead)
# Backend runs with tsx in dev; in prod we run it the same way since it's simpler
# than compiling with tsc + resolving .js extensions

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["pnpm", "--filter", "backend", "exec", "tsx", "src/index.ts"]
