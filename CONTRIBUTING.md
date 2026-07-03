# Contributing to QA Flow

First off, thank you for considering contributing to QA Flow! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Git Flow](#git-flow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Style Guide](#style-guide)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to fostering an open and welcoming environment. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/qa-flow.git
   cd qa-flow
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/davidG97/qa-flow.git
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   pnpm approve-builds  # Select all with 'a', confirm with 'y'
   ```

5. **Setup the database**
   ```bash
   cp server/.env.example server/.env
   pnpm db:migrate
   pnpm db:generate
   ```

6. **Start development server**
   ```bash
   pnpm dev:all
   ```

7. Open http://localhost:3000

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/davidG97/qa-flow/issues)
2. If not, create a new issue using the **Bug Report** template
3. Include as much detail as possible

### Suggesting Features

1. Check if the feature has been suggested in [Issues](https://github.com/davidG97/qa-flow/issues)
2. If not, create a new issue using the **Feature Request** template
3. Explain the use case and expected behavior

### Contributing Code

1. Find an issue to work on or create one
2. Comment on the issue to let others know you're working on it
3. Create a branch from `main`
4. Make your changes following the [Commit Guidelines](#commit-guidelines)
5. Submit a Pull Request to `main`
6. Wait for review from collaborators

## Git Flow

QA Flow uses a simplified Git flow where **collaborators control all releases**:

```
┌─────────────────────────────────────────────────────────────┐
│                     CONTRIBUTORS                            │
│  Fork → feature/* → PR to main → Review → Merge            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     COLLABORATORS                           │
│  Review PRs → Merge to main → Manual Release (when ready)  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       ┌─────────────┐                 ┌─────────────┐
       │   STABLE    │                 │    BETA     │
       │  v1.2.0     │                 │ v1.3.0-beta │
       │  :latest    │                 │   :beta     │
       └─────────────┘                 └─────────────┘
```

### For Contributors

1. **Fork** the repository
2. **Create a branch** from `main`: `feat/my-feature`
3. **Make commits** following [Conventional Commits](#commit-guidelines)
4. **Open a PR** targeting `main`
5. **Address feedback** from reviewers
6. **Wait for merge** - collaborators will merge when ready

### For Collaborators

Collaborators have full control over when releases are created:

1. **Review and merge** PRs to `main`
2. **When ready to release**, go to Actions → Release → Run workflow
3. **Choose version type**: patch, minor, or major
4. **Choose release type**: stable or beta (prerelease)

> **Note**: Merging to `main` does NOT automatically create a release. All releases are manual.

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `ci` | CI/CD changes |

### Examples

```bash
feat(nodes): add new "Scroll" node type
fix(executor): handle timeout errors gracefully
docs(readme): update installation instructions
refactor(api): simplify authentication middleware
```

## Pull Request Process

1. **Create a branch**
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests if applicable
   - Update documentation if needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

4. **Push to your fork**
   ```bash
   git push origin feat/your-feature-name
   ```

5. **Create a Pull Request**
   - Target the `main` branch
   - Fill out the PR template
   - Link related issues

6. **Address review feedback**
   - Make requested changes
   - Push additional commits
   - Request re-review when ready

### PR Requirements

- [ ] All CI checks pass
- [ ] Code follows style guidelines
- [ ] Tests added/updated (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] No merge conflicts

## Release Process

> **Only for collaborators with write access**

Releases are created manually via GitHub Actions:

### Creating a Stable Release

1. Go to **Actions** → **Release** → **Run workflow**
2. Select version bump: `patch`, `minor`, or `major`
3. Leave "Create as beta" unchecked
4. Click **Run workflow**

This creates:
- GitHub Release with changelog
- Docker image tagged as `latest` and `X.Y.Z`
- npm package `qa-flow` at version `X.Y.Z`

### Creating a Beta Release

1. Go to **Actions** → **Release** → **Run workflow**
2. Select version bump: `patch`, `minor`, or `major`
3. Check ✅ "Create as beta/prerelease"
4. Click **Run workflow**

This creates:
- GitHub Pre-release (`vX.Y.Z-beta.N`)
- Docker image tagged as `beta` and `X.Y.Z-beta.N`
- npm package `qa-flow@beta` at version `X.Y.Z-beta.N`

### Required Secrets

The release workflow requires these repository secrets:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `NPM_TOKEN` | npm automation token (for publishing) |

### Version Bump Guide

| Type | When to use | Example |
|------|-------------|----------|
| `patch` | Bug fixes, small changes | 1.0.0 → 1.0.1 |
| `minor` | New features (backwards compatible) | 1.0.1 → 1.1.0 |
| `major` | Breaking changes | 1.1.0 → 2.0.0 |

## Style Guide

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer interfaces over types for object shapes
- Use meaningful variable names

### React

- Use functional components with hooks
- Use `memo()` for node components (React Flow)
- Keep components small and focused
- Use custom hooks for reusable logic

### Backend

- Follow existing service patterns
- Use `.js` extension for local imports (NodeNext resolution)
- Export singleton service objects

### CSS

- Use CSS variables for colors and spacing
- Follow BEM-like naming conventions
- Keep styles modular

## Project Structure

```
qa-flow/
├── src/                 # Frontend (React + Vite)
│   ├── components/      # UI components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Route pages
│   ├── services/        # API client
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities
│
├── server/              # Backend (Express)
│   ├── src/
│   │   ├── controllers/ # HTTP handlers
│   │   ├── services/    # Business logic
│   │   ├── routes/      # API routes
│   │   └── middleware/  # Express middleware
│   └── prisma/          # Database schema
│
└── .github/             # GitHub workflows & templates
```

## Database

QA Flow uses **Prisma ORM** with SQLite (compatible with Turso/libsql). Can connect to PostgreSQL, MySQL or SQL Server.

### Models

| Model | Description |
|-------|-------------|
| `User` | Users with roles (ADMIN / USER) |
| `Project` | Test flows (nodes, edges, config) |
| `ProjectMember` | Project membership (OWNER / MEMBER) |
| `TestRun` | Execution records |
| `TestResult` | Individual node results |
| `Report` | Generated HTML reports |

### Commands

```bash
pnpm db:generate          # Generate Prisma client
pnpm db:migrate           # Run migrations
pnpm db:studio            # Open Prisma Studio (GUI)
pnpm --filter qa-flow-server db:reset  # Reset database
```

### Production Database

Edit `server/.env`:

```env
# PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# MySQL
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Update provider in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  # or "mysql", "sqlserver"
}
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Projects
- `GET /api/projects` - List
- `POST /api/projects` - Create
- `GET /api/projects/:id` - Get
- `PUT /api/projects/:id` - Update
- `DELETE /api/projects/:id` - Delete

### Execution
- `POST /api/run` - Execute flow
- `GET /api/status/:executionId` - Status
- `GET /api/test-runs` - List runs
- `GET /api/test-runs/:id/report` - HTML report

### Recording
- `POST /api/record/start` - Start recording
- `POST /api/record/stop/:sessionId` - Stop
- `GET /api/record/nodes/:sessionId` - Get nodes

### Code
- `POST /api/generate-code` - Generate Playwright code
- `POST /api/parse-code` - Parse code to nodes

## Scripts

### Development

```bash
pnpm dev:all     # Frontend + backend
pnpm dev         # Frontend only (port 3000)
pnpm server      # Backend only (port 3001)
pnpm test        # Run tests
```

### Build

```bash
pnpm build       # Frontend
pnpm build:all   # All packages
pnpm --filter qa-flow-server build  # Backend only
```

## Need Help?

- 💬 [GitHub Discussions](https://github.com/davidG97/qa-flow/discussions)
- 📖 [README](README.md)
- 🐛 [Issue Tracker](https://github.com/davidG97/qa-flow/issues)

---

Thank you for contributing! 🚀
