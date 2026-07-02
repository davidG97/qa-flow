# Contributing to QA Flow

First off, thank you for considering contributing to QA Flow! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
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
3. Create a branch from `develop`
4. Make your changes
5. Submit a Pull Request

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
   git checkout develop
   git pull upstream develop
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
   - Target the `develop` branch
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

## Need Help?

- 💬 [GitHub Discussions](https://github.com/davidG97/qa-flow/discussions)
- 📖 [README](README.md)
- 🐛 [Issue Tracker](https://github.com/davidG97/qa-flow/issues)

---

Thank you for contributing! 🚀
