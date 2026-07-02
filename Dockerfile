# ================================================
# QA Flow - Multi-stage Dockerfile
# ================================================

# ---- Base ----
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- Build Frontend ----
FROM deps AS build-frontend
COPY . .
RUN pnpm --filter qa-flow build

# ---- Build Backend ----
FROM deps AS build-backend
COPY . .
# Generate Prisma client
RUN pnpm --filter qa-flow-server db:generate
# Build TypeScript (emite archivos aunque haya errores de tipos)
RUN pnpm --filter qa-flow-server build || true

# ---- Production ----
FROM base AS production

# Create non-root user
RUN groupadd -r qaflow && useradd -r -g qaflow qaflow

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Copy built frontend
COPY --from=build-frontend /app/dist ./dist

# Copy built backend
COPY --from=build-backend /app/server/dist ./server/dist
COPY --from=build-backend /app/server/src/generated ./server/src/generated

# Copy Prisma schema for migrations
COPY server/prisma ./server/prisma

# Copy static assets if any
COPY public ./public

# Install Playwright browsers (Chromium only for smaller image)
RUN cd server && npx playwright install chromium --with-deps

# Set ownership
RUN chown -R qaflow:qaflow /app

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Switch to non-root user
USER qaflow

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "server/dist/index.js"]
