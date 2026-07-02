import { TestFlow, ProjectConfig } from '../types/index.js';

interface EmulationOptions {
  device?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  locale?: string;
  timezoneId?: string;
  geoLatitude?: string;
  geoLongitude?: string;
  geoAccuracy?: number;
  colorScheme?: string;
  reducedMotion?: string;
  forcedColors?: string;
  offline?: boolean;
  javaScriptEnabled?: boolean;
  userAgent?: string;
  permissions?: string[];
}

/**
 * Servicio para generar código Playwright desde un flujo
 */
export class CodeGeneratorService {
  /**
   * Genera código test.use() para opciones de emulación
   */
  private generateEmulationCode(config: Record<string, unknown>): string[] {
    const lines: string[] = [];
    const useOptions: string[] = [];

    const emulation = config as EmulationOptions;

    // Si hay dispositivo, usar devices
    if (emulation.device) {
      lines.push(`import { devices } from '@playwright/test';`);
      lines.push(``);
      useOptions.push(`  ...devices['${emulation.device}'],`);
    }

    // Viewport personalizado
    if (emulation.viewportWidth && emulation.viewportHeight) {
      useOptions.push(`  viewport: { width: ${emulation.viewportWidth}, height: ${emulation.viewportHeight} },`);
    }

    // Device scale factor
    if (emulation.deviceScaleFactor && emulation.deviceScaleFactor !== 1) {
      useOptions.push(`  deviceScaleFactor: ${emulation.deviceScaleFactor},`);
    }

    // Mobile y Touch
    if (emulation.isMobile === true) {
      useOptions.push(`  isMobile: true,`);
    }
    if (emulation.hasTouch === true) {
      useOptions.push(`  hasTouch: true,`);
    }

    // Localización
    if (emulation.locale) {
      useOptions.push(`  locale: '${emulation.locale}',`);
    }
    if (emulation.timezoneId) {
      useOptions.push(`  timezoneId: '${emulation.timezoneId}',`);
    }

    // Geolocalización
    if (emulation.geoLatitude && emulation.geoLongitude) {
      useOptions.push(`  geolocation: { latitude: ${emulation.geoLatitude}, longitude: ${emulation.geoLongitude}${emulation.geoAccuracy ? `, accuracy: ${emulation.geoAccuracy}` : ''} },`);
      useOptions.push(`  permissions: ['geolocation'],`);
    }

    // Esquema de color
    if (emulation.colorScheme) {
      useOptions.push(`  colorScheme: '${emulation.colorScheme}',`);
    }

    // Reduced motion
    if (emulation.reducedMotion) {
      useOptions.push(`  reducedMotion: '${emulation.reducedMotion}',`);
    }

    // Forced colors
    if (emulation.forcedColors) {
      useOptions.push(`  forcedColors: '${emulation.forcedColors}',`);
    }

    // Offline
    if (emulation.offline === true) {
      useOptions.push(`  offline: true,`);
    }

    // JavaScript habilitado
    if (emulation.javaScriptEnabled === false) {
      useOptions.push(`  javaScriptEnabled: false,`);
    }

    // User Agent
    if (emulation.userAgent) {
      useOptions.push(`  userAgent: '${emulation.userAgent.replace(/'/g, "\\'")}',`);
    }

    // Permisos adicionales
    if (emulation.permissions && emulation.permissions.length > 0) {
      const existingGeoPermission = emulation.geoLatitude && emulation.geoLongitude;
      const perms = existingGeoPermission 
        ? [...emulation.permissions, 'geolocation'] 
        : emulation.permissions;
      const uniquePerms = [...new Set(perms)];
      useOptions.push(`  permissions: [${uniquePerms.map(p => `'${p}'`).join(', ')}],`);
    }

    if (useOptions.length > 0) {
      lines.push(`test.use({`);
      lines.push(...useOptions);
      lines.push(`});`);
      lines.push(``);
    }

    return lines;
  }

  /**
   * Genera código Playwright ejecutable desde un flujo
   */
  generate(flow: TestFlow): string {
    // Ordenar nodos (simplificado - en producción usar topological sort)
    const sortedNodes = [...flow.nodes].sort((a, b) => a.position.y - b.position.y);
    
    // Obtener configuración del proyecto
    const config: ProjectConfig = flow.config || {
      executionMode: 'default',
      workers: 4,
      maxFailures: 0,
      retries: 0,
      timeout: 30000,
    };
    
    // Encontrar todos los nodos start (cada uno es un test)
    const startNodes = sortedNodes.filter(n => n.data.nodeType === 'start');
    
    // Encontrar hooks
    const hooks = this.identifyHooks(sortedNodes, flow.edges);
    
    // Determinar si necesitamos importar devices (si algún test usa emulación de dispositivo)
    const hasDeviceEmulation = startNodes.some(n => n.data.config.device);
    
    const lines: string[] = [];
    
    if (hasDeviceEmulation) {
      lines.push(`import { test, expect, devices } from '@playwright/test';`);
    } else {
      lines.push(`import { test, expect } from '@playwright/test';`);
    }
    lines.push(``);
    
    // Agregar configuración de modo de ejecución si no es default
    if (config.executionMode === 'parallel' || config.executionMode === 'serial') {
      lines.push(`// Configurar modo de ejecución: ${config.executionMode}`);
      lines.push(`test.describe.configure({ mode: '${config.executionMode}' });`);
      lines.push(``);
    }
    
    // Generar test.use() con opciones de emulación del primer nodo start
    // (En caso de múltiples tests, se asume la misma configuración de emulación)
    if (startNodes.length > 0) {
      const emulationConfig = startNodes[0].data.config;
      const emulationLines = this.generateEmulationCode(emulationConfig);
      // Remover el import de devices si ya lo agregamos arriba
      const filteredEmulationLines = emulationLines.filter(l => !l.startsWith('import { devices'));
      lines.push(...filteredEmulationLines);
    }
    
    // Generar beforeAll si existe
    if (hooks.beforeAll.length > 0) {
      lines.push(`test.beforeAll(async ({ browser }) => {`);
      lines.push(`  const page = await browser.newPage();`);
      for (const node of hooks.beforeAll) {
        const { nodeType, config: nodeConfig } = node.data;
        const selector = this.buildSelector(nodeConfig);
        const code = this.generateNodeCode(nodeType, nodeConfig, selector, '  ');
        if (code) lines.push(code);
      }
      lines.push(`  await page.close();`);
      lines.push(`});`);
      lines.push(``);
    }
    
    // Generar beforeEach si existe
    if (hooks.beforeEach.length > 0) {
      lines.push(`test.beforeEach(async ({ page }) => {`);
      for (const node of hooks.beforeEach) {
        const { nodeType, config: nodeConfig } = node.data;
        const selector = this.buildSelector(nodeConfig);
        const code = this.generateNodeCode(nodeType, nodeConfig, selector, '  ');
        if (code) lines.push(code);
      }
      lines.push(`});`);
      lines.push(``);
    }
    
    // Generar código para cada test (cada nodo start)
    for (const startNode of startNodes) {
      const testName = (startNode.data.config.testName as string) || flow.name || 'Test generado por QA Flow';
      const tags = (startNode.data.config.tags as string[]) || [];
      
      // Generar la declaración del test con tags si existen
      if (tags.length > 0) {
        const tagsStr = tags.length === 1 
          ? `'${tags[0]}'` 
          : `[${tags.map(t => `'${t}'`).join(', ')}]`;
        lines.push(`test('${testName}', {`);
        lines.push(`  tag: ${tagsStr},`);
        lines.push(`}, async ({ page }) => {`);
      } else {
        lines.push(`test('${testName}', async ({ page }) => {`);
      }

      // Generar código siguiendo el flujo dinámicamente
      const generatedCode = this.generateFlowCode(startNode.id, sortedNodes, flow.edges, '  ');
      lines.push(...generatedCode);

      lines.push(`});`);
      lines.push(``);
    }
    
    // Generar afterEach si existe
    if (hooks.afterEach.length > 0) {
      lines.push(`test.afterEach(async ({ page }) => {`);
      for (const node of hooks.afterEach) {
        const { nodeType, config: nodeConfig } = node.data;
        const selector = this.buildSelector(nodeConfig);
        const code = this.generateNodeCode(nodeType, nodeConfig, selector, '  ');
        if (code) lines.push(code);
      }
      lines.push(`});`);
      lines.push(``);
    }
    
    // Generar afterAll si existe
    if (hooks.afterAll.length > 0) {
      lines.push(`test.afterAll(async ({ browser }) => {`);
      lines.push(`  const page = await browser.newPage();`);
      for (const node of hooks.afterAll) {
        const { nodeType, config: nodeConfig } = node.data;
        const selector = this.buildSelector(nodeConfig);
        const code = this.generateNodeCode(nodeType, nodeConfig, selector, '  ');
        if (code) lines.push(code);
      }
      lines.push(`  await page.close();`);
      lines.push(`});`);
      lines.push(``);
    }
    
    // Agregar configuración sugerida para playwright.config.ts
    const hasConfigOptions = config.workers > 0 || config.maxFailures > 0 || config.retries > 0 || config.timeout !== 30000;
    if (hasConfigOptions) {
      lines.push(`/*`);
      lines.push(` * Configuración sugerida para playwright.config.ts:`);
      lines.push(` * `);
      lines.push(` * import { defineConfig } from '@playwright/test';`);
      lines.push(` * `);
      lines.push(` * export default defineConfig({`);
      if (config.workers > 0) {
        lines.push(` *   workers: ${config.workers},`);
      }
      if (config.maxFailures > 0) {
        lines.push(` *   maxFailures: ${config.maxFailures},`);
      }
      if (config.retries > 0) {
        lines.push(` *   retries: ${config.retries},`);
      }
      if (config.timeout !== 30000) {
        lines.push(` *   timeout: ${config.timeout},`);
      }
      lines.push(` * });`);
      lines.push(` */`);
    }
    
    return lines.join('\n');
  }

  /**
   * Identifica los hooks y obtiene los nodos conectados a cada uno
   */
  private identifyHooks(
    allNodes: TestFlow['nodes'],
    edges: TestFlow['edges']
  ): { beforeAll: TestFlow['nodes']; beforeEach: TestFlow['nodes']; afterEach: TestFlow['nodes']; afterAll: TestFlow['nodes'] } {
    const hooks = {
      beforeAll: [] as TestFlow['nodes'],
      beforeEach: [] as TestFlow['nodes'],
      afterEach: [] as TestFlow['nodes'],
      afterAll: [] as TestFlow['nodes'],
    };

    const hookTypes = ['beforeAll', 'beforeEach', 'afterEach', 'afterAll'] as const;

    for (const hookType of hookTypes) {
      const hookNodes = allNodes.filter(n => n.data.nodeType === hookType);
      for (const hookNode of hookNodes) {
        // Obtener todos los nodos conectados al hook (excluyendo el hook mismo)
        const connectedNodes = this.getConnectedNodes(hookNode.id, allNodes, edges)
          .filter(n => n.id !== hookNode.id);
        hooks[hookType].push(...connectedNodes);
      }
    }

    return hooks;
  }

  /**
   * Genera código siguiendo el flujo dinámicamente, manejando nodos if
   */
  private generateFlowCode(
    startNodeId: string,
    allNodes: TestFlow['nodes'],
    edges: TestFlow['edges'],
    indent: string
  ): string[] {
    const lines: string[] = [];
    const visited = new Set<string>();
    
    const processNode = (nodeId: string, currentIndent: string): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = allNodes.find(n => n.id === nodeId);
      if (!node) return;
      
      const { nodeType, config: nodeConfig } = node.data;
      
      // Si es un nodo if, manejar las ramas
      if (nodeType === 'if') {
        const conditionType = nodeConfig.conditionType as string || 'elementExists';
        const ifSelector = this.buildSelector(nodeConfig) || nodeConfig.selector as string || '';
        
        let conditionCode = '';
        switch (conditionType) {
          case 'elementExists':
            conditionCode = `await page.locator('${ifSelector}').count() > 0`;
            break;
          case 'elementVisible':
            conditionCode = `await page.locator('${ifSelector}').isVisible()`;
            break;
          case 'textContains':
            conditionCode = `(await page.locator('body').textContent())?.includes('${ifSelector}')`;
            break;
          case 'urlContains':
            conditionCode = `page.url().includes('${ifSelector}')`;
            break;
          default:
            conditionCode = `/* Condición no soportada: ${conditionType} */`;
        }
        
        lines.push(`${currentIndent}// Condición: ${conditionType}`);
        lines.push(`${currentIndent}if (${conditionCode}) {`);
        
        // Encontrar y procesar rama TRUE
        const trueEdge = edges.find(e => e.source === nodeId && e.sourceHandle === 'if-true');
        if (trueEdge) {
          const trueNodes = this.getNodesInBranch(trueEdge.target, allNodes, edges, visited);
          for (const branchNode of trueNodes) {
            const branchSelector = this.buildSelector(branchNode.data.config);
            const code = this.generateNodeCode(branchNode.data.nodeType, branchNode.data.config, branchSelector, currentIndent + '  ');
            if (code) lines.push(code);
            visited.add(branchNode.id);
          }
        }
        
        lines.push(`${currentIndent}} else {`);
        
        // Encontrar y procesar rama FALSE
        const falseEdge = edges.find(e => e.source === nodeId && e.sourceHandle === 'if-false');
        if (falseEdge) {
          const falseNodes = this.getNodesInBranch(falseEdge.target, allNodes, edges, visited);
          for (const branchNode of falseNodes) {
            const branchSelector = this.buildSelector(branchNode.data.config);
            const code = this.generateNodeCode(branchNode.data.nodeType, branchNode.data.config, branchSelector, currentIndent + '  ');
            if (code) lines.push(code);
            visited.add(branchNode.id);
          }
        }
        
        lines.push(`${currentIndent}}`);
        return;
      }
      
      // Para nodos normales, generar código
      const selector = this.buildSelector(nodeConfig);
      const code = this.generateNodeCode(nodeType, nodeConfig, selector, currentIndent);
      if (code) lines.push(code);
      
      // Continuar con el siguiente nodo
      const nextEdge = edges.find(e => e.source === nodeId && !e.sourceHandle);
      if (nextEdge) {
        processNode(nextEdge.target, currentIndent);
      } else {
        // Si no hay edge sin sourceHandle, buscar cualquier edge
        const anyEdge = edges.find(e => e.source === nodeId);
        if (anyEdge) {
          processNode(anyEdge.target, currentIndent);
        }
      }
    };
    
    // Comenzar desde el nodo start
    const startNode = allNodes.find(n => n.id === startNodeId);
    if (startNode) {
      // Generar código del nodo start
      const startConfig = startNode.data.config;
      if (startConfig.baseUrl) {
        lines.push(`${indent}await page.goto('${startConfig.baseUrl}');`);
      }
      visited.add(startNodeId);
      
      // Continuar con el siguiente nodo
      const nextEdge = edges.find(e => e.source === startNodeId);
      if (nextEdge) {
        processNode(nextEdge.target, indent);
      }
    }
    
    return lines;
  }

  /**
   * Obtiene los nodos en una rama (hasta encontrar un nodo ya visitado o sin salida)
   */
  private getNodesInBranch(
    startId: string,
    allNodes: TestFlow['nodes'],
    edges: TestFlow['edges'],
    globalVisited: Set<string>
  ): TestFlow['nodes'] {
    const result: TestFlow['nodes'] = [];
    const queue = [startId];
    const localVisited = new Set<string>();
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (localVisited.has(currentId) || globalVisited.has(currentId)) continue;
      localVisited.add(currentId);
      
      const node = allNodes.find(n => n.id === currentId);
      if (node) {
        // No incluir nodos if en la rama - se procesan aparte
        if (node.data.nodeType === 'if') continue;
        
        result.push(node);
        
        // Encontrar siguiente nodo
        const nextEdge = edges.find(e => e.source === currentId && !e.sourceHandle);
        if (nextEdge && !globalVisited.has(nextEdge.target)) {
          queue.push(nextEdge.target);
        } else {
          const anyEdge = edges.find(e => e.source === currentId);
          if (anyEdge && !globalVisited.has(anyEdge.target)) {
            queue.push(anyEdge.target);
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Obtiene los nodos conectados a un nodo start siguiendo los edges
   */
  private getConnectedNodes(
    startId: string, 
    allNodes: TestFlow['nodes'], 
    edges: TestFlow['edges']
  ): TestFlow['nodes'] {
    const result: TestFlow['nodes'] = [];
    const visited = new Set<string>();
    const queue = [startId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      const node = allNodes.find(n => n.id === currentId);
      if (node) {
        result.push(node);
        
        // Encontrar nodos conectados
        const connectedEdges = edges.filter(e => e.source === currentId);
        for (const edge of connectedEdges) {
          if (!visited.has(edge.target)) {
            queue.push(edge.target);
          }
        }
      }
    }
    
    // Ordenar por posición Y para mantener orden visual
    return result.sort((a, b) => a.position.y - b.position.y);
  }

  /**
   * Genera código para un nodo específico
   */
  private generateNodeCode(
    nodeType: string, 
    config: Record<string, unknown>, 
    selector: string, 
    indent: string
  ): string {
    switch (nodeType) {
      // ===== NODOS DE CONTROL =====
      case 'start':
        return config.baseUrl ? `${indent}await page.goto('${config.baseUrl}');` : '';
        
      case 'navigate':
        return `${indent}await page.goto('${config.url}');`;

      // ===== ACCIONES DE CLICK =====
      case 'click':
        return `${indent}await page.locator('${selector}').click();`;
        
      case 'dblclick':
        return `${indent}await page.locator('${selector}').dblclick();`;
        
      case 'tap':
        return `${indent}await page.locator('${selector}').tap();`;

      // ===== ACCIONES DE FORMULARIO =====
      case 'check':
        return config.action === 'uncheck'
          ? `${indent}await page.locator('${selector}').uncheck();`
          : `${indent}await page.locator('${selector}').check();`;
        
      case 'type':
        const typeLines = [];
        if (config.clearFirst) {
          typeLines.push(`${indent}await page.locator('${selector}').fill('');`);
        }
        typeLines.push(`${indent}await page.locator('${selector}').type('${config.text}');`);
        return typeLines.join('\n');
        
      case 'fill':
        return `${indent}await page.locator('${selector}').fill('${config.value}');`;
        
      case 'clear':
        return `${indent}await page.locator('${selector}').clear();`;
        
      case 'select':
        if (config.selectBy === 'label') {
          return `${indent}await page.locator('${selector}').selectOption({ label: '${config.value}' });`;
        } else if (config.selectBy === 'index') {
          return `${indent}await page.locator('${selector}').selectOption({ index: ${config.value} });`;
        }
        return `${indent}await page.locator('${selector}').selectOption('${config.value}');`;
        
      case 'setInputFiles':
        return `${indent}await page.locator('${selector}').setInputFiles('${config.filePath}');`;

      // ===== ACCIONES DE TECLADO =====
      case 'press':
        const key = config.customKey || config.key || 'Enter';
        return `${indent}await page.locator('${selector}').press('${key}');`;
        
      case 'pressSequentially':
        return `${indent}await page.locator('${selector}').pressSequentially('${config.text}', { delay: ${config.delay || 50} });`;

      // ===== ACCIONES DE FOCO =====
      case 'hover':
        return `${indent}await page.locator('${selector}').hover();`;
        
      case 'focus':
        return `${indent}await page.locator('${selector}').focus();`;
        
      case 'blur':
        return `${indent}await page.locator('${selector}').blur();`;
        
      case 'selectText':
        return `${indent}await page.locator('${selector}').selectText();`;

      // ===== ACCIONES DE SCROLL/DRAG =====
      case 'scrollIntoView':
        return `${indent}await page.locator('${selector}').scrollIntoViewIfNeeded();`;
        
      case 'dragTo':
        return `${indent}await page.locator('${config.sourceSelector}').dragTo(page.locator('${config.targetSelector}'));`;

      // ===== ACCIONES DE ESPERA =====
      case 'wait':
        if (config.waitType === 'time') {
          return `${indent}await page.waitForTimeout(${config.value});`;
        } else if (config.waitType === 'selector') {
          return `${indent}await page.waitForSelector('${config.value}');`;
        } else if (config.waitType === 'networkidle') {
          return `${indent}await page.waitForLoadState('networkidle');`;
        }
        return '';
        
      case 'waitFor':
        return `${indent}await page.locator('${selector}').waitFor({ state: '${config.state || 'visible'}' });`;

      // ===== ACCIONES DE EVENTO =====
      case 'dispatchEvent':
        return `${indent}await page.locator('${selector}').dispatchEvent('${config.eventType || 'click'}');`;

      // ===== CAPTURA =====
      case 'screenshot':
        if (config.selector) {
          return `${indent}await page.locator('${config.selector}').screenshot({ path: 'screenshots/${config.name}.png' });`;
        }
        return `${indent}await page.screenshot({ path: 'screenshots/${config.name}.png'${config.fullPage ? ', fullPage: true' : ''} });`;

      // ===== GETTERS =====
      case 'getAttribute':
        return `${indent}const ${config.variableName || 'attrValue'} = await page.locator('${selector}').getAttribute('${config.attribute}');`;
        
      case 'inputValue':
        return `${indent}const ${config.variableName || 'inputVal'} = await page.locator('${selector}').inputValue();`;
        
      case 'textContent':
        return `${indent}const ${config.variableName || 'textVal'} = await page.locator('${selector}').textContent();`;

      // ===== ASERCIONES DE VISIBILIDAD =====
      case 'assertVisible':
        return config.negate
          ? `${indent}await expect(page.locator('${selector}')).not.toBeVisible();`
          : `${indent}await expect(page.locator('${selector}')).toBeVisible();`;
        
      case 'assertHidden':
        return `${indent}await expect(page.locator('${selector}')).toBeHidden();`;
        
      case 'assertAttached':
        return config.attached === 'false'
          ? `${indent}await expect(page.locator('${selector}')).not.toBeAttached();`
          : `${indent}await expect(page.locator('${selector}')).toBeAttached();`;
        
      case 'assertInViewport':
        return config.ratio && (config.ratio as number) > 0
          ? `${indent}await expect(page.locator('${selector}')).toBeInViewport({ ratio: ${config.ratio} });`
          : `${indent}await expect(page.locator('${selector}')).toBeInViewport();`;

      // ===== ASERCIONES DE ESTADO =====
      case 'assertChecked':
        return config.checked === 'false'
          ? `${indent}await expect(page.locator('${selector}')).not.toBeChecked();`
          : `${indent}await expect(page.locator('${selector}')).toBeChecked();`;
        
      case 'assertEnabled':
        return `${indent}await expect(page.locator('${selector}')).toBeEnabled();`;
        
      case 'assertDisabled':
        return `${indent}await expect(page.locator('${selector}')).toBeDisabled();`;
        
      case 'assertEditable':
        return config.editable === 'false'
          ? `${indent}await expect(page.locator('${selector}')).not.toBeEditable();`
          : `${indent}await expect(page.locator('${selector}')).toBeEditable();`;
        
      case 'assertEmpty':
        return `${indent}await expect(page.locator('${selector}')).toBeEmpty();`;
        
      case 'assertFocused':
        return `${indent}await expect(page.locator('${selector}')).toBeFocused();`;

      // ===== ASERCIONES DE TEXTO =====
      case 'assertText':
        if (config.matchType === 'exact') {
          return `${indent}await expect(page.locator('${selector}')).toHaveText('${config.expectedText}');`;
        } else if (config.matchType === 'regex') {
          return `${indent}await expect(page.locator('${selector}')).toHaveText(/${config.expectedText}/);`;
        }
        return `${indent}await expect(page.locator('${selector}')).toContainText('${config.expectedText}');`;

      // ===== ASERCIONES DE ATRIBUTOS =====
      case 'assertAttribute':
        return config.expectedValue
          ? `${indent}await expect(page.locator('${selector}')).toHaveAttribute('${config.attribute}', '${config.expectedValue}');`
          : `${indent}await expect(page.locator('${selector}')).toHaveAttribute('${config.attribute}');`;
        
      case 'assertClass':
        return config.matchType === 'contains'
          ? `${indent}await expect(page.locator('${selector}')).toHaveClass(/${config.expectedClass}/);`
          : `${indent}await expect(page.locator('${selector}')).toHaveClass('${config.expectedClass}');`;
        
      case 'assertCSS':
        return `${indent}await expect(page.locator('${selector}')).toHaveCSS('${config.cssProperty}', '${config.expectedValue}');`;
        
      case 'assertId':
        return `${indent}await expect(page.locator('${selector}')).toHaveId('${config.expectedId}');`;
        
      case 'assertRole':
        return `${indent}await expect(page.locator('${selector}')).toHaveRole('${config.expectedRole}');`;

      // ===== ASERCIONES DE ACCESIBILIDAD =====
      case 'assertAccessibleName':
        return `${indent}await expect(page.locator('${selector}')).toHaveAccessibleName('${config.expectedName}');`;
        
      case 'assertAccessibleDescription':
        return `${indent}await expect(page.locator('${selector}')).toHaveAccessibleDescription('${config.expectedDescription}');`;

      // ===== ASERCIONES DE VALOR =====
      case 'assertValue':
        return `${indent}await expect(page.locator('${selector}')).toHaveValue('${config.expectedValue}');`;
        
      case 'assertValues':
        const values = (config.expectedValues as string).split(',').map((v: string) => `'${v.trim()}'`).join(', ');
        return `${indent}await expect(page.locator('${selector}')).toHaveValues([${values}]);`;
        
      case 'assertCount':
        return `${indent}await expect(page.locator('${selector}')).toHaveCount(${config.expectedCount});`;

      // ===== ASERCIONES DE PÁGINA =====
      case 'assertUrl':
        if (config.matchType === 'exact') {
          return `${indent}await expect(page).toHaveURL('${config.expectedUrl}');`;
        } else if (config.matchType === 'regex') {
          return `${indent}await expect(page).toHaveURL(/${config.expectedUrl}/);`;
        }
        return `${indent}await expect(page.url()).toContain('${config.expectedUrl}');`;
        
      case 'assertTitle':
        if (config.matchType === 'exact') {
          return `${indent}await expect(page).toHaveTitle('${config.expectedTitle}');`;
        }
        return `${indent}await expect(page).toHaveTitle(/${config.expectedTitle}/);`;

      // ===== ASERCIÓN VISUAL =====
      case 'assertScreenshot':
        return config.selector
          ? `${indent}await expect(page.locator('${config.selector}')).toHaveScreenshot('${config.screenshotName}.png');`
          : `${indent}await expect(page).toHaveScreenshot('${config.screenshotName}.png');`;

      // ===== CONTROL DE FLUJO =====
      case 'if':
        // Los nodos if se manejan de forma especial en generateFlowCode
        return '';

      // ===== CÓDIGO PERSONALIZADO =====
      case 'code':
        const codeLines = (config.code as string || '').split('\\n');
        const indentedCode = codeLines.map(line => `${indent}${line}`).join('\\n');
        const description = config.description ? `${indent}// ${config.description}\\n` : '';
        return `${description}${indentedCode}`;
        
      default:
        return `${indent}// TODO: Nodo no soportado: ${nodeType}`;
    }
  }

  /**
   * Construye el selector con el prefijo correcto para generación de código
   */
  private buildSelector(config: Record<string, unknown>): string {
    const selector = config.selector as string;
    if (!selector) return '';
    
    const selectorType = config.selectorType as string || 'css';
    
    // Lista de prefijos válidos de Playwright
    const playwrightPrefixes = ['css=', 'xpath=', 'text=', 'role=', 'data-testid=', 'id=', 'data-test-id=', 'data-test='];
    
    // Si el selector ya tiene un prefijo de Playwright, usarlo directamente
    const hasPlaywrightPrefix = playwrightPrefixes.some(prefix => selector.startsWith(prefix));
    if (hasPlaywrightPrefix) {
      return selector;
    }
    
    switch (selectorType) {
      case 'xpath':
        return `xpath=${selector}`;
      case 'text':
        return `text=${selector}`;
      case 'role':
        return `role=${selector}`;
      case 'testId':
        return `data-testid=${selector}`;
      case 'auto':
        if (selector.startsWith('//') || selector.startsWith('(//')) {
          return `xpath=${selector}`;
        }
        if (selector.match(/^[a-z]+\[/i) || selector.match(/^[a-z]+$/i)) {
          return `role=${selector}`;
        }
        return selector;
      default:
        return selector;
    }
  }
}

export const codeGeneratorService = new CodeGeneratorService();
