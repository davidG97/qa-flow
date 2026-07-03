#!/usr/bin/env node

const { execSync, spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { version: VERSION } = require('../package.json');

const IMAGE = 'davidg97/qa-flow';
const PORT = process.env.QA_FLOW_PORT || '3001';
const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

const BANNER = `
${CYAN}${BRIGHT}
   ██████╗  █████╗     ███████╗██╗      ██████╗ ██╗    ██╗
  ██╔═══██╗██╔══██╗    ██╔════╝██║     ██╔═══██╗██║    ██║
  ██║   ██║███████║    █████╗  ██║     ██║   ██║██║ █╗ ██║
  ██║▄▄ ██║██╔══██║    ██╔══╝  ██║     ██║   ██║██║███╗██║
  ╚██████╔╝██║  ██║    ██║     ███████╗╚██████╔╝╚███╔███╔╝
   ╚══▀▀═╝ ╚═╝  ╚═╝    ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
${RESET}
  ${BRIGHT}Visual Test Editor for Playwright${RESET}
  Version: ${VERSION}
`;

function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { port: PORT };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      console.log(`qa-flow v${VERSION} - Visual Test Editor for Playwright

Usage: npx qa-flow [options]

Options:
  -p, --port <port>  Port (default: 3001)
  -v, --version      Version
  -h, --help         Help

Docs: https://github.com/davidG97/qa-flow`);
      process.exit(0);
    }
    
    if (arg === '--version' || arg === '-v') {
      console.log(`qa-flow v${VERSION}`);
      process.exit(0);
    }
    
    if ((arg === '--port' || arg === '-p') && args[i + 1]) {
      options.port = args[i + 1];
      i++;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log(BANNER);

  if (!checkDocker()) {
    console.log(`${RED}❌ Docker not found. Install from: https://docs.docker.com/get-docker/${RESET}`);
    process.exit(1);
  }

  console.log(`${GREEN}🐳 Pulling ${IMAGE}:latest...${RESET}`);

  try {
    execSync(`docker pull ${IMAGE}:latest`, { stdio: 'inherit' });
  } catch {
    console.log(`${YELLOW}⚠️  Using cached image${RESET}`);
  }

  console.log(`\n${GREEN}🚀 Starting on port ${options.port}...${RESET}`);
  console.log(`   Open: http://localhost:${options.port}`);
  console.log(`   Login: admin@qaflow.com / admin123\n`);

  const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('base64');

  const docker = spawn('docker', [
    'run', '-it', '--rm', '--name', 'qa-flow',
    '-p', `${options.port}:3001`,
    '-e', `JWT_SECRET=${jwtSecret}`,
    '-v', 'qa-flow-data:/app/data',
    '-v', 'qa-flow-screenshots:/app/server/screenshots',
    '-v', 'qa-flow-recordings:/app/server/recordings',
    `${IMAGE}:latest`
  ], { stdio: 'inherit' });

  process.on('SIGINT', () => {
    console.log(`\n${YELLOW}👋 Stopping...${RESET}`);
    try { execSync('docker stop qa-flow', { stdio: 'ignore' }); } catch {}
    process.exit(0);
  });

  docker.on('error', (err) => {
    console.log(`${RED}❌ ${err.message}${RESET}`);
    process.exit(1);
  });

  docker.on('exit', (code) => {
    if (code && code !== 0) console.log(`${RED}❌ Exit code ${code}${RESET}`);
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.log(`${RED}❌ ${err.message}${RESET}`);
  process.exit(1);
});
