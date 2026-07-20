<div align="center">
  <img src="public/logo.png" alt="QA Flow Logo" width="120" />
  <h1>QA Flow</h1>
  <p><strong>Visual test editor for Playwright</strong></p>
  <p>Design, run, and manage your tests intuitively using a canvas with draggable nodes. No code required.</p>

  <br />

  [![npm](https://img.shields.io/npm/v/@davidg97/qa-flow)](https://www.npmjs.com/package/@davidg97/qa-flow)
  [![Docker](https://img.shields.io/docker/v/davidg1997/qa-flow?label=docker)](https://hub.docker.com/r/davidg1997/qa-flow)
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue)](LICENSE)
  
  <br />
  
  <a href="#quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-user-guide">Guide</a> •
  <a href="#-docker">Docker</a> •
  <a href="https://davidg97.github.io/qa-flow">Website</a>
</div>

<br />

<div align="center">
  <img src="landing/public/screenshots/image.png" alt="QA Flow Editor" width="800" />
</div>

<br />

## Quick Start

Try QA Flow instantly with [npx](https://docs.npmjs.com/cli/v7/commands/npx) (requires [Node.js](https://nodejs.org/) and [Docker](https://docs.docker.com/get-docker/)):

\`\`\`bash
npx @davidg97/qa-flow
\`\`\`

Or run directly with Docker:

\`\`\`bash
docker run -it --rm -p 3001:3001 -v qa-flow-data:/app/data davidg1997/qa-flow
\`\`\`

Open **http://localhost:3001** → Login: \`admin@qa-flow.local\` / \`admin123\`

---

## ✨ Features

| Category | Functionality |
|----------|---------------|
| **Editor** | Interactive canvas, draggable nodes, visual connections |
| **Execution** | Real-time via WebSocket, parallel with workers, retries |
| **Live View** | 📺 Integrated screencast in execution panel |
| **Browser** | Chrome/Chromium + device emulation |
| **Reports** | Playwright-style HTML, screenshots, history |
| **Code** | Generates executable Playwright, records interactions |
| **Management** | Page Objects, reusable locators, JSON import/export |
| **Security** | JWT authentication, roles (Admin/User) |

---

## 📖 User Guide

### 1. Create Project

1. Log in with \`admin@qa-flow.local\` / \`admin123\`
2. Click "New Project"
3. Name your project

### 2. Design Test

1. **Drag the "Start" node** → configure URL and browser
2. **Add actions**: Navigate, Click, Type, Verify
3. **Connect nodes** by dragging between points

### 3. Configure Selectors

- **Visual Picker** 🎯: Select elements directly in the browser
  - Local: Opens Chrome and shows native picker
  - Docker: Interactive screencast (click on image to select)
  - Automatically runs previous steps before showing selector
- **Manual**: Write CSS/XPath selector

### 4. Execute

1. Click **▶️ Run**
2. **📺 Watch execution in real-time** in the side panel (automatic screencast)
3. Observe progress: 🟢 success, 🔴 failure, 🟡 in progress
4. Review the generated **HTML report**

### Example: Login Test

\`\`\`
[Start] → [Navigate: /login] → [Type: email] → [Type: password] → [Click: Submit] → [Verify: Dashboard]
\`\`\`

<details>
<summary>View configuration</summary>

| Node | Configuration |
|------|---------------|
| Start | URL: \`https://myapp.com\`, Browser: Chromium |
| Navigate | Path: \`/login\` |
| Type | Selector: \`#email\`, Text: \`user@test.com\` |
| Type | Selector: \`#password\`, Text: \`mypassword\` |
| Click | Selector: \`button[type="submit"]\` |
| Verify | Selector: \`.dashboard\`, Type: \`visible\` |

</details>

---

## 🎯 Node Types

| Type | Nodes |
|------|-------|
| **Trigger** | Start (URL, browser, viewport) |
| **Hooks** | beforeAll, beforeEach, afterEach, afterAll |
| **Actions** | Navigate, Click, Type, Wait, Screenshot, Scroll, Hover, Key |
| **Assertions** | Verify text, visible, URL, attribute |

### Device Emulation

The Start node allows emulating:
- **Devices**: iPhone, Pixel, iPad, Galaxy
- **Viewport**: Width, height, scale
- **Location**: Language, timezone, geolocation
- **Appearance**: Light/dark theme
- **Network**: Offline mode, User Agent

---

## 🐳 Docker

### Local (SQLite)

\`\`\`bash
docker run -it --rm \\
  -p 3001:3001 \\
  -v qa-flow-data:/app/data \\
  davidg1997/qa-flow
\`\`\`

### Cloud (Turso)

\`\`\`bash
docker run -it --rm \\
  -p 3001:3001 \\
  -e DATABASE_URL="libsql://your-db.turso.io" \\
  -e TURSO_AUTH_TOKEN="your-token" \\
  davidg1997/qa-flow
\`\`\`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`PORT\` | Server port | \`3001\` |
| \`JWT_SECRET\` | Secret for JWT tokens | ⚠️ Required |
| \`DATABASE_URL\` | Database connection URL | Local SQLite |
| \`CDP_URL\` | Remote Chrome URL (optional) | - |

---

## 📺 Watch Execution in Real-Time

QA Flow offers **two ways** to visualize test execution:

### Option 1: Integrated Screencast (Recommended) ✨

**No configuration needed**. When running a test, the execution panel automatically shows what the browser is doing:

1. Click **▶️ Run**
2. The side panel shows browser view in real-time
3. Watch each action as it executes

> The screencast uses CDP internally to stream frames from headless browser to frontend.

### Option 2: Remote CDP (Advanced)

If you prefer watching execution in your own Chrome:

<details>
<summary>View CDP instructions</summary>

#### 1. Open Chrome with remote debugging

> ⚠️ **Important**: Close all Chrome instances before running. The \`--user-data-dir\` flag is required.

**Windows:**
\`\`\`cmd
"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\\chrome-cdp"
\`\`\`

**macOS:**
\`\`\`bash
/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp
\`\`\`

**Linux:**
\`\`\`bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp
\`\`\`

**Verify it works:**
\`\`\`bash
curl http://127.0.0.1:9222/json/version
\`\`\`

#### 2. Configure QA Flow

In the **Start** node, "Advanced" section:
- **CDP URL**: \`http://127.0.0.1:9222\`

Or with Docker:
\`\`\`bash
docker run -p 3001:3001 -e CDP_URL="http://host.docker.internal:9222" davidg1997/qa-flow
\`\`\`

> **Windows/Mac**: Use \`host.docker.internal\`  
> **Linux**: Use \`--network=host\` or your local IP

#### 3. Execute

The test will run in your Chrome and you can interact with it.

> **💡 Visual Picker in Docker**: With CDP configured, the visual element selector also works in Docker. Runs previous steps in your Chrome before showing the picker.

</details>

---

## ⚙️ Project Configuration

In the configuration modal:

| Option | Description |
|--------|-------------|
| **Mode** | Serial or Parallel |
| **Workers** | Parallel instances (1-10) |
| **Retries** | Times to retry failed tests |
| **Timeout** | Maximum time per action |
| **Max Failures** | Stop after N failures |

---

## 🔐 Production Security

⚠️ **Before deploying**:

1. Configure \`JWT_SECRET\` (minimum 32 characters)
2. Change initial admin credentials
3. Use HTTPS

---

## 🤝 Contributing

Want to contribute? See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Local development setup
- Project structure
- Database and API
- Commit guidelines

---

## 📄 License

[Apache License 2.0](LICENSE)

---

Built with ❤️ using React, Playwright and Prisma
