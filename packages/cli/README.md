# QA Flow CLI

Visual test editor for Playwright. Design, run, and manage automated tests with a drag-and-drop canvas.

## Quick Start

```bash
npx qa-flow
```

This will:
1. Pull the latest Docker image
2. Start QA Flow on port 3001
3. Open the editor at http://localhost:3001

## Options

```bash
npx qa-flow [options]

Options:
  --port, -p <port>   Port to run on (default: 3001)
  --version, -v       Show version
  --help, -h          Show help
```

## Examples

```bash
# Start on default port 3001
npx qa-flow

# Start on custom port
npx qa-flow -p 8080

# Using environment variable
QA_FLOW_PORT=8080 npx qa-flow
```

## Requirements

- Docker installed and running
- Node.js 18+

## Links

- [GitHub Repository](https://github.com/davidG97/qa-flow)
- [Documentation](https://github.com/davidG97/qa-flow#readme)
- [Website](https://davidg97.github.io/qa-flow)

## License

Apache-2.0
