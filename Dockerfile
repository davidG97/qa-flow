# ================================================
# QA Flow - Multi-stage Dockerfile
# ================================================

# ---- Base (build toolchain only, no browser libs) ----
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Browsers are installed once in the production stage, never in build stages
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN corepack enable

WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ---- Build Frontend ----
FROM deps AS build-frontend
COPY . .
RUN pnpm --filter qa-flow build

# ---- Build Backend ----
FROM deps AS build-backend
COPY . .
# Dummy URL for build, real URL at runtime
ENV DATABASE_URL="file:./build.db"
RUN pnpm --filter qa-flow-server db:generate
# Build TypeScript (emite archivos aunque haya errores de tipos)
RUN pnpm --filter qa-flow-server build || true

# ---- Production ----
FROM node:22-slim AS production

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Shared location so the non-root user can read the browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/app/browsers
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/app/data/qa-flow.db

RUN corepack enable && groupadd -r qaflow && useradd -r -g qaflow qaflow

WORKDIR /app

# Only the server runtime deps: the frontend ships as prebuilt static files.
# Install scripts stay off so Playwright does not download browsers twice;
# Prisma's engines are fetched explicitly instead.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts --filter qa-flow-server \
    && pnpm rebuild @prisma/engines

# Chromium plus its shared libraries (single source of runtime OS deps)
RUN pnpm --filter qa-flow-server exec playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm /root/.cache

# Built artifacts
COPY --from=build-frontend /app/dist ./dist
COPY --from=build-backend /app/server/dist ./server/dist
COPY --from=build-backend /app/server/src/generated ./server/src/generated

# Prisma schema + migrations are needed by `prisma migrate deploy` at startup
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/prisma.config.ts

COPY --chmod=755 docker-entrypoint.sh /app/
# Chown only the writable paths: a recursive chown on /app would duplicate every
# node_modules/browser file into an extra ~1.5GB layer.
# The Prisma CLI requires its engines dir to be writable before running migrations.
RUN mkdir -p /app/data /app/server/recordings /app/server/screenshots \
    && chown qaflow:qaflow /app/data /app/server/recordings /app/server/screenshots \
    && chown -R qaflow:qaflow /app/node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines

EXPOSE 3001

USER qaflow

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
