# Agent Instructions for QA Flow

Visual test editor for Playwright. See [README.md](README.md) for features and installation.

## Quick Commands

This project uses **pnpm workspaces**. Run all commands from the root directory.

```bash
# Development
pnpm dev:all              # Start frontend (3000) + backend (3001)
pnpm dev                  # Frontend only
pnpm server               # Backend only

# Build
pnpm build                # Frontend build
pnpm build:all            # Build all packages

# Database (from root)
pnpm db:migrate           # Run migrations
pnpm db:generate          # Generate Prisma client
pnpm db:studio            # Open Prisma Studio

# Tests
pnpm test                 # Run server tests

# Filter commands (run in specific package)
pnpm --filter qa-flow-server <script>   # Run script in server
pnpm --filter qa-flow <script>          # Run script in frontend
pnpm -r <script>                        # Run script in all packages
```

## Architecture

```
qa-flow/
├── src/                    # React frontend (Vite + React 19)
│   ├── components/         # UI components
│   │   ├── nodes/          # React Flow node components
│   │   └── panels/         # Sidebar panels
│   ├── pages/              # Route pages (/projects, /locators)
│   ├── services/api.ts     # REST + WebSocket client
│   ├── hooks/              # Custom React hooks
│   └── types/              # TypeScript types
├── server/                 # Express backend
│   ├── src/
│   │   ├── controllers/    # HTTP handlers
│   │   ├── services/       # Business logic
│   │   │   ├── executor.service.ts     # Test execution engine
│   │   │   ├── code-generator.service.ts
│   │   │   ├── recorder.service.ts     # Playwright code parser
│   │   │   └── database.service.ts     # Prisma singleton
│   │   ├── routes/         # API route definitions
│   │   └── generated/prisma/  # Prisma client
│   └── prisma/schema.prisma
└── package.json            # Frontend deps
```

## Critical Conventions

### Backend TypeScript Imports
Always use `.js` extension for local imports (NodeNext resolution):
```typescript
// ✅ Correct
import { prisma } from './database.service.js';

// ❌ Wrong - will fail at runtime
import { prisma } from './database.service';
```

### Prisma Client Location
Client is generated to `server/src/generated/prisma`, not default location:
```typescript
import { PrismaClient } from './generated/prisma/index.js';
```

### pnpm Workspaces
This is a monorepo using pnpm workspaces:
- Root `/package.json` - Frontend (name: `qa-flow`)
- `/server/package.json` - Backend (name: `qa-flow-server`)

Install dependencies with a single command from root:
```bash
pnpm install
```

Add dependencies to specific packages:
```bash
pnpm add <package> --filter qa-flow          # Frontend
pnpm add <package> --filter qa-flow-server   # Backend
```

### Component Patterns
React Flow nodes use `memo()` wrapper:
```tsx
export const MyNode = memo(({ data, selected }: NodeProps<MyNodeData>) => {
  // ...
});
```

### API Service Pattern
Backend services export singleton objects:
```typescript
export const myService = {
  async doSomething() { ... }
};
```

## Database

- **ORM**: Prisma 7.8 with libsql adapter (Turso compatible)
- **DB File**: `server/prisma/dev.db` (SQLite)
- **Schema**: `server/prisma/schema.prisma`

Key models: `Project`, `TestRun`, `TestResult`, `Report`, `PageObject`, `Locator`

Run migrations after schema changes:
```bash
pnpm db:migrate
```

## Common Pitfalls

1. **Port conflicts**: Frontend=3000, Backend=3001 - both must be free
2. **Database not initialized**: Run `db:migrate` + `db:generate` before first run
3. **WebSocket required**: Test execution needs WS connection to backend
4. **JSON fields**: Nodes/edges stored as JSON strings - parse with `JSON.parse()`
5. **No ESLint in server**: Only root has linting configured

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Add new node type | `src/components/nodes/`, `server/src/services/executor.service.ts` |
| Add API endpoint | `server/src/routes/`, `server/src/controllers/` |
| Modify test execution | `server/src/services/executor.service.ts` |
| Change code generation | `server/src/services/code-generator.service.ts` |
| Parse Playwright code | `server/src/services/recorder.service.ts` |
| Add locator features | `src/pages/LocatorsPage.tsx`, `server/src/services/locators.service.ts` |
