import { spawn, ChildProcess } from 'node:child_process';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FlowNode, FlowEdge } from '../types/index.js';

interface RecordingSession {
  id: string;
  process: ChildProcess;
  outputFile: string;
  status: 'recording' | 'completed' | 'error';
  startedAt: Date;
  completedAt?: Date;
  code?: string;
  error?: string;
}

const activeSessions = new Map<string, RecordingSession>();

/**
 * Inicia una sesión de grabación con Playwright Codegen
 */
export async function startRecording(url?: string): Promise<{ sessionId: string; message: string }> {
  const sessionId = uuidv4();
  const outputFile = path.join(process.cwd(), 'recordings', `recording-${sessionId}.ts`);
  
  // Crear carpeta de recordings si no existe
  const recordingsDir = path.join(process.cwd(), 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    try {
      // Argumentos para codegen
      const args = ['playwright', 'codegen', '--output', outputFile];
      if (url) {
        args.push(url);
      }

      console.log(`🎬 Iniciando grabación: ${sessionId}`);
      console.log(`   Comando: npx ${args.join(' ')}`);

      const process = spawn('npx', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      const session: RecordingSession = {
        id: sessionId,
        process,
        outputFile,
        status: 'recording',
        startedAt: new Date(),
      };

      activeSessions.set(sessionId, session);

      // Cuando el proceso termina
      process.on('close', (code) => {
        console.log(`🎬 Grabación finalizada: ${sessionId} (código: ${code})`);
        
        if (fs.existsSync(outputFile)) {
          const generatedCode = fs.readFileSync(outputFile, 'utf-8');
          session.code = generatedCode;
          session.status = 'completed';
        } else {
          session.status = 'error';
          session.error = 'No se generó código';
        }
        session.completedAt = new Date();
      });

      process.on('error', (err) => {
        console.error(`❌ Error en grabación ${sessionId}:`, err);
        session.status = 'error';
        session.error = err.message;
        session.completedAt = new Date();
      });

      // Esperar un momento para que el proceso inicie
      setTimeout(() => {
        resolve({
          sessionId,
          message: 'Grabación iniciada. Interactúa con el navegador y ciérralo cuando termines.',
        });
      }, 1000);

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Obtiene el estado de una sesión de grabación
 */
export function getRecordingStatus(sessionId: string): RecordingSession | null {
  return activeSessions.get(sessionId) || null;
}

/**
 * Detiene una sesión de grabación
 */
export function stopRecording(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (session && session.process) {
    session.process.kill('SIGTERM');
    return true;
  }
  return false;
}

/**
 * Parsea código Playwright y lo convierte a nodos de flujo
 */
export function parsePlaywrightCodeToNodes(code: string): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  
  // Extraer la URL inicial del goto
  const gotoMatch = code.match(/await page\.goto\(['"]([^'"]+)['"]\)/);
  const baseUrl = gotoMatch ? gotoMatch[1] : 'https://example.com';

  // Nodo de inicio
  let nodeId = 1;
  const startNode: FlowNode = {
    id: String(nodeId++),
    type: 'testNode',
    position: { x: 250, y: 50 },
    data: {
      label: 'Inicio',
      nodeType: 'start',
      category: 'trigger',
      config: {
        baseUrl,
        browser: 'chromium',
        headless: false,
      },
    },
  };
  nodes.push(startNode);

  // Patrones para diferentes acciones de Playwright
  const patterns = [
    // getByRole click
    {
      regex: /await page\.getByRole\(['"]([^'"]+)['"],\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: `role=${match[1]}[name="${match[2]}"]`,
          selectorType: 'text',
          clickCount: 1,
        },
      }),
    },
    // getByLabel click
    {
      regex: /await page\.getByLabel\(['"]([^'"]+)['"]\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'text',
          clickCount: 1,
        },
      }),
    },
    // getByPlaceholder click
    {
      regex: /await page\.getByPlaceholder\(['"]([^'"]+)['"]\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: `[placeholder="${match[1]}"]`,
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // getByTestId click
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'testId',
          clickCount: 1,
        },
      }),
    },
    // getByTestId + getByPlaceholder click (chained locator)
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.getByPlaceholder\(['"]([^'"]+)['"]\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: `[data-testid="${match[1]}"] [placeholder="${match[2]}"]`,
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // getByTestId + getByPlaceholder fill (chained locator)
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.getByPlaceholder\(['"]([^'"]+)['"]\)\.fill\(['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: `[data-testid="${match[1]}"] [placeholder="${match[2]}"]`,
          selectorType: 'css',
          value: match[3],
        },
      }),
    },
    // getByTestId + getByRole click (chained locator)
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.getByRole\(['"]([^'"]+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: `[data-testid="${match[1]}"] ${match[3] ? `${match[2]}[name="${match[3]}"]` : match[2]}`,
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // getByTestId + getByRole fill (chained locator)
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.getByRole\(['"]([^'"]+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\)\.fill\(['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: `[data-testid="${match[1]}"] ${match[3] ? `${match[2]}[name="${match[3]}"]` : match[2]}`,
          selectorType: 'css',
          value: match[4],
        },
      }),
    },
    // locator with filter and nth - click (handles complex chained locators)
    {
      regex: /await page\.locator\(['"]([^'"]+)['"]\)\.filter\(\{\s*hasText:\s*['"]([^'"]+)['"]\s*\}\)(?:\.nth\((\d+)\))?\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: `${match[1]}:has-text("${match[2]}")${match[3] ? `:nth-match(${match[3]})` : ''}`,
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // locator with filter and nth - fill
    {
      regex: /await page\.locator\(['"]([^'"]+)['"]\)\.filter\(\{\s*hasText:\s*['"]([^'"]+)['"]\s*\}\)(?:\.nth\((\d+)\))?\.fill\(['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: `${match[1]}:has-text("${match[2]}")${match[3] ? `:nth-match(${match[3]})` : ''}`,
          selectorType: 'css',
          value: match[4],
        },
      }),
    },
    // locator with nth only - click
    {
      regex: /await page\.locator\(['"]([^'"]+)['"]\)\.nth\((\d+)\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: `${match[1]}:nth-match(${match[2]})`,
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // locator with first() - click
    {
      regex: /await page\.locator\(['"]([^'"]+)['"]\)\.first\(\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: `${match[1]}:first-child`,
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // locator with last() - click
    {
      regex: /await page\.locator\(['"]([^'"]+)['"]\)\.last\(\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: `${match[1]}:last-child`,
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // locator click (handles selectors with nested quotes like [data-test="value"])
    {
      regex: /await page\.locator\('([^']+)'\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // locator click with double quotes
    {
      regex: /await page\.locator\("([^"]+)"\)\.click\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // click directo
    {
      regex: /await page\.click\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'click',
        label: 'Click',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'css',
          clickCount: 1,
        },
      }),
    },
    // getByRole check (checkbox)
    {
      regex: /await page\.getByRole\(['"]checkbox['"],\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)\.check\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Marcar Checkbox',
        category: 'action' as const,
        config: {
          selector: `role=checkbox[name="${match[1]}"]`,
          action: 'check',
        },
      }),
    },
    // getByRole uncheck (checkbox)
    {
      regex: /await page\.getByRole\(['"]checkbox['"],\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)\.uncheck\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Desmarcar Checkbox',
        category: 'action' as const,
        config: {
          selector: `role=checkbox[name="${match[1]}"]`,
          action: 'uncheck',
        },
      }),
    },
    // getByLabel check
    {
      regex: /await page\.getByLabel\(['"]([^'"]+)['"]\)\.check\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Marcar Checkbox',
        category: 'action' as const,
        config: {
          selector: match[1],
          action: 'check',
        },
      }),
    },
    // getByLabel uncheck
    {
      regex: /await page\.getByLabel\(['"]([^'"]+)['"]\)\.uncheck\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Desmarcar Checkbox',
        category: 'action' as const,
        config: {
          selector: match[1],
          action: 'uncheck',
        },
      }),
    },
    // getByTestId check
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.check\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Marcar Checkbox',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'testId',
          action: 'check',
        },
      }),
    },
    // getByTestId uncheck
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.uncheck\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Desmarcar Checkbox',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'testId',
          action: 'uncheck',
        },
      }),
    },
    // locator check (single quotes)
    {
      regex: /await page\.locator\('([^']+)'\)\.check\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Marcar Checkbox',
        category: 'action' as const,
        config: {
          selector: match[1],
          action: 'check',
        },
      }),
    },
    // locator check (double quotes)
    {
      regex: /await page\.locator\("([^"]+)"\)\.check\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Marcar Checkbox',
        category: 'action' as const,
        config: {
          selector: match[1],
          action: 'check',
        },
      }),
    },
    // locator uncheck (single quotes)
    {
      regex: /await page\.locator\('([^']+)'\)\.uncheck\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Desmarcar Checkbox',
        category: 'action' as const,
        config: {
          selector: match[1],
          action: 'uncheck',
        },
      }),
    },
    // locator uncheck (double quotes)
    {
      regex: /await page\.locator\("([^"]+)"\)\.uncheck\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: 'Desmarcar Checkbox',
        category: 'action' as const,
        config: {
          selector: match[1],
          action: 'uncheck',
        },
      }),
    },
    // setChecked (true/false)
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\(['"]checkbox['"],\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)|getByLabel\(['"]([^'"]+)['"]\))\.setChecked\((true|false)\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'check',
        label: match[4] === 'true' ? 'Marcar Checkbox' : 'Desmarcar Checkbox',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2] || match[3],
          action: match[4] === 'true' ? 'check' : 'uncheck',
        },
      }),
    },
    // getByRole fill
    {
      regex: /await page\.getByRole\(['"]([^'"]+)['"],\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)\.fill\(['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: `role=${match[1]}[name="${match[2]}"]`,
          value: match[3],
        },
      }),
    },
    // getByLabel fill
    {
      regex: /await page\.getByLabel\(['"]([^'"]+)['"]\)\.fill\(['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: match[1],
          value: match[2],
        },
      }),
    },
    // getByPlaceholder fill
    {
      regex: /await page\.getByPlaceholder\(['"]([^'"]+)['"]\)\.fill\(['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: `[placeholder="${match[1]}"]`,
          value: match[2],
        },
      }),
    },
    // getByTestId fill
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.fill\(['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'testId',
          value: match[2],
        },
      }),
    },
    // locator fill (handles selectors with nested quotes)
    {
      regex: /await page\.locator\('([^']+)'\)\.fill\(['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: match[1],
          value: match[2],
        },
      }),
    },
    // locator fill with double quotes
    {
      regex: /await page\.locator\("([^"]+)"\)\.fill\(['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: match[1],
          value: match[2],
        },
      }),
    },
    // fill directo
    {
      regex: /await page\.fill\(['"]([^'"]+)['"],\s*['"]([^'"]*)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'fill',
        label: 'Rellenar Campo',
        category: 'action' as const,
        config: {
          selector: match[1],
          value: match[2],
        },
      }),
    },
    // goto (después del primero)
    {
      regex: /await page\.goto\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray, index: number) => {
        if (index === 0) return null; // Skip el primer goto (ya está en el nodo start)
        return {
          nodeType: 'navigate',
          label: 'Navegar',
          category: 'action' as const,
          config: {
            url: match[1],
            waitUntil: 'load',
          },
        };
      },
    },
    // selectOption
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByLabel\(['"]([^'"]+)['"]\))\.selectOption\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'select',
        label: 'Seleccionar Opción',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2],
          value: match[3],
          selectBy: 'value',
        },
      }),
    },
    // locator selectOption (single quotes - handles nested quotes)
    {
      regex: /await page\.locator\('([^']+)'\)\.selectOption\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'select',
        label: 'Seleccionar Opción',
        category: 'action' as const,
        config: {
          selector: match[1],
          value: match[2],
          selectBy: 'value',
        },
      }),
    },
    // locator selectOption (double quotes - handles nested quotes)
    {
      regex: /await page\.locator\("([^"]+)"\)\.selectOption\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'select',
        label: 'Seleccionar Opción',
        category: 'action' as const,
        config: {
          selector: match[1],
          value: match[2],
          selectBy: 'value',
        },
      }),
    },
    // getByTestId selectOption
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.selectOption\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'select',
        label: 'Seleccionar Opción',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'testId',
          value: match[2],
          selectBy: 'value',
        },
      }),
    },
    // getByTestId hover
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.hover\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'hover',
        label: 'Hover',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'testId',
        },
      }),
    },
    // getByTestId press
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.press\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'type',
        label: 'Presionar Tecla',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'testId',
          text: match[2],
          clearFirst: false,
          delay: 0,
        },
      }),
    },
    // hover
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\([^)]+\))\.hover\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'hover',
        label: 'Hover',
        category: 'action' as const,
        config: {
          selector: match[1] || match[0].match(/getByRole\(['"]([^'"]+)['"]/)?.[1] || '',
        },
      }),
    },
    // locator hover (single quotes - handles nested quotes)
    {
      regex: /await page\.locator\('([^']+)'\)\.hover\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'hover',
        label: 'Hover',
        category: 'action' as const,
        config: {
          selector: match[1],
        },
      }),
    },
    // locator hover (double quotes - handles nested quotes)
    {
      regex: /await page\.locator\("([^"]+)"\)\.hover\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'hover',
        label: 'Hover',
        category: 'action' as const,
        config: {
          selector: match[1],
        },
      }),
    },
    // press (keyboard)
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\([^)]+\))\.press\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'type',
        label: 'Presionar Tecla',
        category: 'action' as const,
        config: {
          selector: match[1] || '',
          text: match[2],
          clearFirst: false,
          delay: 0,
        },
      }),
    },
    // locator press (single quotes - handles nested quotes)
    {
      regex: /await page\.locator\('([^']+)'\)\.press\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'type',
        label: 'Presionar Tecla',
        category: 'action' as const,
        config: {
          selector: match[1],
          text: match[2],
          clearFirst: false,
          delay: 0,
        },
      }),
    },
    // locator press (double quotes - handles nested quotes)
    {
      regex: /await page\.locator\("([^"]+)"\)\.press\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'type',
        label: 'Presionar Tecla',
        category: 'action' as const,
        config: {
          selector: match[1],
          text: match[2],
          clearFirst: false,
          delay: 0,
        },
      }),
    },
    // expect toBeVisible
    {
      regex: /await expect\(page\.(?:locator|getByRole|getByText|getByLabel|getByTestId)\(['"]([^'"]+)['"]\)?\)\.toBeVisible\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'assertVisible',
        label: 'Verificar Visible',
        category: 'assertion' as const,
        config: {
          selector: match[1],
          timeout: 5000,
        },
      }),
    },
    // expect toHaveText
    {
      regex: /await expect\(page\.(?:locator|getByRole|getByText|getByTestId)\(['"]([^'"]+)['"]\)?\)\.toHaveText\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'assertText',
        label: 'Verificar Texto',
        category: 'assertion' as const,
        config: {
          selector: match[1],
          expectedText: match[2],
          matchType: 'exact',
        },
      }),
    },
    // expect toContainText
    {
      regex: /await expect\(page\.(?:locator|getByRole|getByText|getByTestId)\(['"]([^'"]+)['"]\)?\)\.toContainText\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'assertText',
        label: 'Verificar Texto',
        category: 'assertion' as const,
        config: {
          selector: match[1],
          expectedText: match[2],
          matchType: 'contains',
        },
      }),
    },
    // dblclick - doble click
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\(['"]([^'"]+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\))\.dblclick\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'dblclick',
        label: 'Doble Click',
        category: 'action' as const,
        config: {
          selector: match[1] || `role=${match[2]}${match[3] ? `[name="${match[3]}"]` : ''}`,
          button: 'left',
        },
      }),
    },
    // locator dblclick (single quotes - handles nested quotes)
    {
      regex: /await page\.locator\('([^']+)'\)\.dblclick\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'dblclick',
        label: 'Doble Click',
        category: 'action' as const,
        config: {
          selector: match[1],
          button: 'left',
        },
      }),
    },
    // locator dblclick (double quotes - handles nested quotes)
    {
      regex: /await page\.locator\("([^"]+)"\)\.dblclick\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'dblclick',
        label: 'Doble Click',
        category: 'action' as const,
        config: {
          selector: match[1],
          button: 'left',
        },
      }),
    },
    // getByTestId dblclick
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.dblclick\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'dblclick',
        label: 'Doble Click',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'testId',
          button: 'left',
        },
      }),
    },
    // getByTestId clear
    {
      regex: /await page\.getByTestId\(['"]([^'"]+)['"]\)\.clear\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'clear',
        label: 'Limpiar Campo',
        category: 'action' as const,
        config: {
          selector: match[1],
          selectorType: 'testId',
        },
      }),
    },
    // clear - limpiar campo
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByLabel\(['"]([^'"]+)['"]\)|getByRole\(['"]textbox['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\))\.clear\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'clear',
        label: 'Limpiar Campo',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2] || `role=textbox${match[3] ? `[name="${match[3]}"]` : ''}`,
        },
      }),
    },
    // locator clear (single quotes - handles nested quotes)
    {
      regex: /await page\.locator\('([^']+)'\)\.clear\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'clear',
        label: 'Limpiar Campo',
        category: 'action' as const,
        config: {
          selector: match[1],
        },
      }),
    },
    // locator clear (double quotes - handles nested quotes)
    {
      regex: /await page\.locator\("([^"]+)"\)\.clear\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'clear',
        label: 'Limpiar Campo',
        category: 'action' as const,
        config: {
          selector: match[1],
        },
      }),
    },
    // blur - quitar foco
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByLabel\(['"]([^'"]+)['"]\))\.blur\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'blur',
        label: 'Quitar Foco',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2],
        },
      }),
    },
    // locator blur (single quotes - handles nested quotes)
    {
      regex: /await page\.locator\('([^']+)'\)\.blur\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'blur',
        label: 'Quitar Foco',
        category: 'action' as const,
        config: {
          selector: match[1],
        },
      }),
    },
    // locator blur (double quotes - handles nested quotes)
    {
      regex: /await page\.locator\("([^"]+)"\)\.blur\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'blur',
        label: 'Quitar Foco',
        category: 'action' as const,
        config: {
          selector: match[1],
        },
      }),
    },
    // focus - dar foco
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByLabel\(['"]([^'"]+)['"]\))\.focus\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'focus',
        label: 'Dar Foco',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2],
        },
      }),
    },
    // pressSequentially - escribir secuencialmente
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByLabel\(['"]([^'"]+)['"]\)|getByRole\(['"]textbox['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\))\.pressSequentially\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'pressSequentially',
        label: 'Escribir Secuencialmente',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2] || `role=textbox${match[3] ? `[name="${match[3]}"]` : ''}`,
          text: match[4],
          delay: 50,
        },
      }),
    },
    // selectText - seleccionar texto
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByLabel\(['"]([^'"]+)['"]\))\.selectText\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'selectText',
        label: 'Seleccionar Texto',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2],
        },
      }),
    },
    // setInputFiles - subir archivo
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByLabel\(['"]([^'"]+)['"]\))\.setInputFiles\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'setInputFiles',
        label: 'Subir Archivo',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2],
          filePath: match[3],
        },
      }),
    },
    // tap - tap móvil
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\(['"]([^'"]+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\))\.tap\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'tap',
        label: 'Tap (Móvil)',
        category: 'action' as const,
        config: {
          selector: match[1] || `role=${match[2]}${match[3] ? `[name="${match[3]}"]` : ''}`,
        },
      }),
    },
    // dragTo - arrastrar y soltar
    {
      regex: /await page\.locator\(['"]([^'"]+)['"]\)\.dragTo\(page\.locator\(['"]([^'"]+)['"]\)\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'dragTo',
        label: 'Arrastrar y Soltar',
        category: 'action' as const,
        config: {
          sourceSelector: match[1],
          targetSelector: match[2],
        },
      }),
    },
    // scrollIntoViewIfNeeded - scroll
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\(['"]([^'"]+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\))\.scrollIntoViewIfNeeded\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'scrollIntoView',
        label: 'Hacer Scroll',
        category: 'action' as const,
        config: {
          selector: match[1] || `role=${match[2]}${match[3] ? `[name="${match[3]}"]` : ''}`,
        },
      }),
    },
    // dispatchEvent - disparar evento
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\([^)]+\))\.dispatchEvent\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'dispatchEvent',
        label: 'Disparar Evento',
        category: 'action' as const,
        config: {
          selector: match[1] || '',
          eventType: match[2],
        },
      }),
    },
    // waitFor - esperar elemento
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\([^)]+\))\.waitFor\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'waitFor',
        label: 'Esperar Elemento',
        category: 'action' as const,
        config: {
          selector: match[1] || '',
          state: 'visible',
        },
      }),
    },
    // getAttribute
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\([^)]+\))\.getAttribute\(['"]([^'"]+)['"]\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'getAttribute',
        label: 'Obtener Atributo',
        category: 'action' as const,
        config: {
          selector: match[1] || '',
          attribute: match[2],
        },
      }),
    },
    // inputValue
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByLabel\(['"]([^'"]+)['"]\)|getByRole\(['"]textbox['"]\))\.inputValue\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'inputValue',
        label: 'Obtener Valor de Input',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2] || '',
        },
      }),
    },
    // textContent
    {
      regex: /await page\.(?:locator\(['"]([^'"]+)['"]\)|getByRole\([^)]+\)|getByText\(['"]([^'"]+)['"]\))\.textContent\(\)/g,
      handler: (match: RegExpMatchArray) => ({
        nodeType: 'textContent',
        label: 'Obtener Texto',
        category: 'action' as const,
        config: {
          selector: match[1] || match[2] || '',
        },
      }),
    },
  ];

  // Extraer todas las acciones en orden de aparición
  interface ActionMatch {
    index: number;
    nodeData: {
      nodeType: string;
      label: string;
      category: 'trigger' | 'action' | 'assertion' | 'control';
      config: Record<string, unknown>;
    };
  }
  
  const actions: ActionMatch[] = [];

  for (const pattern of patterns) {
    let match;
    let matchIndex = 0;
    const regex = new RegExp(pattern.regex.source, 'g');
    
    while ((match = regex.exec(code)) !== null) {
      const result = pattern.handler(match, matchIndex);
      if (result) {
        actions.push({
          index: match.index,
          nodeData: result,
        });
      }
      matchIndex++;
    }
  }

  // Ordenar por posición en el código
  actions.sort((a, b) => a.index - b.index);

  // Crear nodos y conexiones
  let previousNodeId = startNode.id;
  let yPosition = 150;

  for (const action of actions) {
    const newNode: FlowNode = {
      id: String(nodeId++),
      type: 'testNode',
      position: { x: 250, y: yPosition },
      data: {
        label: action.nodeData.label,
        nodeType: action.nodeData.nodeType,
        category: action.nodeData.category,
        config: action.nodeData.config,
      },
    };
    nodes.push(newNode);

    // Crear conexión con el nodo anterior
    edges.push({
      id: `e${previousNodeId}-${newNode.id}`,
      source: previousNodeId,
      target: newNode.id,
    });

    previousNodeId = newNode.id;
    yPosition += 120;
  }

  return { nodes, edges };
}

/**
 * Limpia sesiones antiguas de memoria
 */
export function cleanupOldSessions(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.completedAt && session.completedAt.getTime() < oneHourAgo) {
      // Eliminar archivo de grabación
      if (fs.existsSync(session.outputFile)) {
        fs.unlinkSync(session.outputFile);
      }
      activeSessions.delete(sessionId);
    }
  }
}

// Limpiar sesiones cada hora
setInterval(cleanupOldSessions, 60 * 60 * 1000);

/**
 * Obtiene la ruta de la carpeta de grabaciones
 */
function getRecordingsDir(): string {
  return path.join(process.cwd(), 'recordings');
}

/**
 * Lista todos los archivos de grabación
 */
export function listRecordingFiles(): { 
  files: Array<{
    filename: string;
    sessionId: string;
    createdAt: Date;
    sizeKB: number;
  }>;
  totalSizeKB: number;
  count: number;
} {
  const recordingsDir = getRecordingsDir();
  
  if (!fs.existsSync(recordingsDir)) {
    return { files: [], totalSizeKB: 0, count: 0 };
  }
  
  const files = fs.readdirSync(recordingsDir)
    .filter(f => f.startsWith('recording-') && f.endsWith('.ts'))
    .map(filename => {
      const filePath = path.join(recordingsDir, filename);
      const stats = fs.statSync(filePath);
      const sessionId = filename.replace('recording-', '').replace('.ts', '');
      
      return {
        filename,
        sessionId,
        createdAt: stats.birthtime,
        sizeKB: Math.round(stats.size / 1024 * 100) / 100,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  const totalSizeKB = files.reduce((sum, f) => sum + f.sizeKB, 0);
  
  return { files, totalSizeKB: Math.round(totalSizeKB * 100) / 100, count: files.length };
}

/**
 * Elimina un archivo de grabación específico
 */
export function deleteRecording(sessionId: string): boolean {
  const recordingsDir = getRecordingsDir();
  const filePath = path.join(recordingsDir, `recording-${sessionId}.ts`);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    activeSessions.delete(sessionId);
    console.log(`🗑️ Grabación eliminada: ${sessionId}`);
    return true;
  }
  
  return false;
}

/**
 * Limpia grabaciones antiguas (por defecto, mayores a 24 horas)
 */
export function cleanupOldRecordings(maxAgeHours: number = 24): { deleted: number; freedKB: number } {
  const recordingsDir = getRecordingsDir();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const cutoffTime = Date.now() - maxAgeMs;
  
  if (!fs.existsSync(recordingsDir)) {
    return { deleted: 0, freedKB: 0 };
  }
  
  let deleted = 0;
  let freedKB = 0;
  
  const files = fs.readdirSync(recordingsDir)
    .filter(f => f.startsWith('recording-') && f.endsWith('.ts'));
  
  for (const filename of files) {
    const filePath = path.join(recordingsDir, filename);
    const stats = fs.statSync(filePath);
    
    if (stats.mtimeMs < cutoffTime) {
      freedKB += stats.size / 1024;
      fs.unlinkSync(filePath);
      deleted++;
      
      // También limpiar de memoria si existe
      const sessionId = filename.replace('recording-', '').replace('.ts', '');
      activeSessions.delete(sessionId);
    }
  }
  
  freedKB = Math.round(freedKB * 100) / 100;
  
  if (deleted > 0) {
    console.log(`🧹 Limpieza de grabaciones: ${deleted} archivos eliminados (${freedKB} KB liberados)`);
  }
  
  return { deleted, freedKB };
}

/**
 * Elimina todas las grabaciones
 */
export function deleteAllRecordings(): { deleted: number; freedKB: number } {
  const recordingsDir = getRecordingsDir();
  
  if (!fs.existsSync(recordingsDir)) {
    return { deleted: 0, freedKB: 0 };
  }
  
  let deleted = 0;
  let freedKB = 0;
  
  const files = fs.readdirSync(recordingsDir)
    .filter(f => f.startsWith('recording-') && f.endsWith('.ts'));
  
  for (const filename of files) {
    const filePath = path.join(recordingsDir, filename);
    const stats = fs.statSync(filePath);
    freedKB += stats.size / 1024;
    fs.unlinkSync(filePath);
    deleted++;
    
    const sessionId = filename.replace('recording-', '').replace('.ts', '');
    activeSessions.delete(sessionId);
  }
  
  freedKB = Math.round(freedKB * 100) / 100;
  console.log(`🗑️ Todas las grabaciones eliminadas: ${deleted} archivos (${freedKB} KB liberados)`);
  
  return { deleted, freedKB };
}

/**
 * Ejecuta limpieza inicial al importar el módulo
 * Elimina grabaciones mayores a 24 horas
 */
cleanupOldRecordings(24);
