import { chromium } from 'playwright-extra';
import { Browser, Page, BrowserContext, CDPSession, devices } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { 
  FlowNode, 
  FlowEdge, 
  TestFlow, 
  ExecutionResult, 
  ExecutionStatus,
  ProjectConfig
} from '../types/index.js';

// ponytail: only chromium gets stealth - the only browser used in practice
chromium.use(StealthPlugin());

export interface ExecutorOptions {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  onProgress?: (status: ExecutionStatus) => void;
  onScreencastFrame?: (frameBase64: string) => void;
}

interface TestCase {
  startNode: FlowNode;
  nodes: FlowNode[];
}

interface HookNodes {
  beforeAll: FlowNode[];
  beforeEach: FlowNode[];
  afterEach: FlowNode[];
  afterAll: FlowNode[];
}

export class FlowExecutor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private readonly executionId: string;
  private status: ExecutionStatus;
  private readonly options: ExecutorOptions;
  private flowNodes: FlowNode[] = [];
  private flowEdges: FlowEdge[] = [];
  private flowConfig: ProjectConfig | undefined;

  constructor(options: ExecutorOptions = {}) {
    this.executionId = uuidv4();
    this.options = {
      headless: true,
      slowMo: 0,
      timeout: 30000,
      ...options,
    };
    this.status = {
      flowId: '',
      status: 'pending',
      results: [],
    };
  }

  private updateStatus(updates: Partial<ExecutionStatus>) {
    this.status = { ...this.status, ...updates };
    this.options.onProgress?.(this.status);
  }

  private addResult(result: ExecutionResult) {
    this.status.results.push(result);
    this.options.onProgress?.(this.status);
  }

  /**
   * Obtiene los nodos conectados a un nodo start siguiendo los edges
   */
  private getConnectedNodes(
    startId: string, 
    allNodes: FlowNode[], 
    edges: FlowEdge[]
  ): FlowNode[] {
    const result: FlowNode[] = [];
    const visited = new Set<string>();
    const queue = [startId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      const node = allNodes.find(n => n.id === currentId);
      if (node) {
        result.push(node);
        
        // Encontrar nodos conectados (salientes)
        const connectedEdges = edges.filter(e => e.source === currentId);
        for (const edge of connectedEdges) {
          if (!visited.has(edge.target)) {
            queue.push(edge.target);
          }
        }
      }
    }
    
    // Ordenar por posición Y pero asegurar que el nodo start siempre esté primero
    const startNode = result.find(n => n.id === startId);
    const otherNodes = result.filter(n => n.id !== startId).sort((a, b) => a.position.y - b.position.y);
    
    return startNode ? [startNode, ...otherNodes] : otherNodes;
  }

  /**
   * Identifica los tests individuales (cada nodo start es un test)
   */
  private identifyTests(flow: TestFlow): TestCase[] {
    const startNodes = flow.nodes.filter(n => n.data.nodeType === 'start');
    
    return startNodes.map(startNode => ({
      startNode,
      nodes: this.getConnectedNodes(startNode.id, flow.nodes, flow.edges),
    }));
  }

  /**
   * Identifica los hooks y obtiene los nodos conectados a cada uno
   */
  private identifyHooks(flow: TestFlow): HookNodes {
    const hooks: HookNodes = {
      beforeAll: [],
      beforeEach: [],
      afterEach: [],
      afterAll: [],
    };

    const hookTypes = ['beforeAll', 'beforeEach', 'afterEach', 'afterAll'] as const;

    for (const hookType of hookTypes) {
      const hookNodes = flow.nodes.filter(n => n.data.nodeType === hookType);
      for (const hookNode of hookNodes) {
        // Obtener todos los nodos conectados al hook (excluyendo el hook mismo)
        const connectedNodes = this.getConnectedNodes(hookNode.id, flow.nodes, flow.edges)
          .filter(n => n.id !== hookNode.id);
        hooks[hookType].push(...connectedNodes);
      }
    }

    return hooks;
  }

  /**
   * Evalúa una condición del nodo "if"
   */
  private async evaluateCondition(config: Record<string, unknown>, page: Page): Promise<boolean> {
    const conditionType = config.conditionType as string || 'elementExists';
    const selector = config.selector as string;

    if (!selector) {
      throw new Error('El selector es requerido para evaluar la condición');
    }

    try {
      switch (conditionType) {
        case 'elementExists': {
          const element = page.locator(selector).first();
          const count = await element.count();
          return count > 0;
        }
        case 'elementVisible': {
          const element = page.locator(selector).first();
          try {
            await expect(element).toBeVisible({ timeout: 5000 });
            return true;
          } catch {
            return false;
          }
        }
        case 'textContains': {
          const bodyText = await page.locator('body').textContent();
          return bodyText?.includes(selector) || false;
        }
        case 'urlContains': {
          const currentUrl = page.url();
          return currentUrl.includes(selector);
        }
        default:
          console.warn(`Tipo de condición no soportado: ${conditionType}`);
          return false;
      }
    } catch (error) {
      console.error(`Error evaluando condición: ${error}`);
      return false;
    }
  }

  /**
   * Obtiene el siguiente nodo basado en el nodo actual y el resultado de la condición
   */
  private getNextNodeId(currentNodeId: string, conditionResult?: boolean): string | null {
    // Encontrar edges que salen del nodo actual
    const outgoingEdges = this.flowEdges.filter(e => e.source === currentNodeId);

    if (outgoingEdges.length === 0) {
      return null;
    }

    // Si hay un resultado de condición, filtrar por el handle correcto
    if (conditionResult !== undefined) {
      const targetHandle = conditionResult ? 'if-true' : 'if-false';
      const edge = outgoingEdges.find(e => e.sourceHandle === targetHandle);
      return edge?.target || null;
    }

    // Para nodos normales, tomar el primer edge
    return outgoingEdges[0]?.target || null;
  }

  /**
   * Ejecuta un flujo de manera dinámica, navegando nodo por nodo
   */
  private async executeDynamicFlow(
    startNodeId: string,
    testName: string,
    page: Page,
    beforeEachNodes?: FlowNode[]
  ): Promise<void> {
    // El nodo start ya fue procesado por initBrowser, registrar su resultado
    const startNode = this.flowNodes.find(n => n.id === startNodeId);
    if (startNode) {
      this.addResult({
        success: true,
        nodeId: startNode.id,
        nodeType: startNode.data.nodeType,
        message: `[${testName}] ${startNode.data.label} ejecutado correctamente`,
        duration: 0,
      });
    }

    // Ejecutar beforeEach si existe
    if (beforeEachNodes && beforeEachNodes.length > 0) {
      for (const hookNode of beforeEachNodes) {
        const hookStartTime = Date.now();
        try {
          await this.executeNodeWithPage(hookNode, page);
          this.addResult({
            success: true,
            nodeId: hookNode.id,
            nodeType: hookNode.data.nodeType,
            message: `[${testName}][beforeEach] ${hookNode.data.label} ejecutado correctamente`,
            duration: Date.now() - hookStartTime,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.addResult({
            success: false,
            nodeId: hookNode.id,
            nodeType: hookNode.data.nodeType,
            message: `[${testName}][beforeEach] Error en ${hookNode.data.label}`,
            duration: Date.now() - hookStartTime,
            error: errorMessage,
          });
          throw error;
        }
      }
    }

    // Obtener el siguiente nodo después del start
    let currentNodeId: string | null = this.getNextNodeId(startNodeId);
    const visited = new Set<string>();
    visited.add(startNodeId); // Marcar start como visitado

    while (currentNodeId) {
      // Prevenir bucles infinitos
      if (visited.has(currentNodeId)) {
        console.warn(`Detectado bucle en nodo ${currentNodeId}, deteniendo ejecución`);
        break;
      }
      visited.add(currentNodeId);

      const node = this.flowNodes.find(n => n.id === currentNodeId);
      if (!node) {
        console.warn(`Nodo no encontrado: ${currentNodeId}`);
        break;
      }

      this.updateStatus({ currentNode: node.id });
      const startTime = Date.now();

      // Manejar nodo "if" de manera especial
      if (node.data.nodeType === 'if') {
        try {
          const conditionResult = await this.evaluateCondition(node.data.config, page);
          this.addResult({
            success: true,
            nodeId: node.id,
            nodeType: node.data.nodeType,
            message: `[${testName}] ${node.data.label} evaluado: ${conditionResult ? 'TRUE' : 'FALSE'}`,
            duration: Date.now() - startTime,
          });
          currentNodeId = this.getNextNodeId(currentNodeId!, conditionResult);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.addResult({
            success: false,
            nodeId: node.id,
            nodeType: node.data.nodeType,
            message: `[${testName}] Error evaluando condición en ${node.data.label}`,
            duration: Date.now() - startTime,
            error: errorMessage,
          });
          throw error;
        }
        continue;
      }

      // Ejecutar nodo normal
      try {
        await this.executeNodeWithPage(node, page);
        this.addResult({
          success: true,
          nodeId: node.id,
          nodeType: node.data.nodeType,
          message: `[${testName}] ${node.data.label} ejecutado correctamente`,
          duration: Date.now() - startTime,
        });
        currentNodeId = this.getNextNodeId(currentNodeId!);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.addResult({
          success: false,
          nodeId: node.id,
          nodeType: node.data.nodeType,
          message: `[${testName}] Error en ${node.data.label}`,
          duration: Date.now() - startTime,
          error: errorMessage,
        });
        throw error;
      }
    }
  }

  /**
   * Verifica si un flujo contiene nodos "if"
   */
  private hasIfNodes(startNodeId: string): boolean {
    const nodes = this.getConnectedNodes(startNodeId, this.flowNodes, this.flowEdges);
    return nodes.some(n => n.data.nodeType === 'if');
  }

  /**
   * Ejecuta los nodos de un hook
   */
  private async executeHookNodes(
    hookName: string,
    nodes: FlowNode[],
    page: Page,
    testName?: string
  ): Promise<void> {
    if (nodes.length === 0) return;

    const prefix = testName ? `[${testName}][${hookName}]` : `[${hookName}]`;
    console.log(`${prefix} Ejecutando (${nodes.length} nodos)`);

    for (const node of nodes) {
      const startTime = Date.now();
      try {
        await this.executeNodeWithPage(node, page);
        
        this.addResult({
          success: true,
          nodeId: node.id,
          nodeType: node.data.nodeType,
          message: `${prefix} ${node.data.label} ejecutado correctamente`,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        this.addResult({
          success: false,
          nodeId: node.id,
          nodeType: node.data.nodeType,
          message: `${prefix} Error en ${node.data.label}`,
          duration: Date.now() - startTime,
          error: errorMessage,
        });
        
        throw error; // Los hooks fallidos detienen la ejecución
      }
    }
  }

  /**
   * Ejecuta los nodos de un hook con un page específico (para ejecución paralela)
   */
  private async executeHookNodesWithPage(
    hookName: string,
    nodes: FlowNode[],
    page: Page,
    testName: string
  ): Promise<void> {
    if (nodes.length === 0) return;

    console.log(`[${testName}][${hookName}] Ejecutando (${nodes.length} nodos)`);

    for (const node of nodes) {
      const startTime = Date.now();
      try {
        await this.executeNodeWithPage(node, page);
        
        this.addResult({
          success: true,
          nodeId: node.id,
          nodeType: node.data.nodeType,
          message: `[${testName}][${hookName}] ${node.data.label} ejecutado correctamente`,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        this.addResult({
          success: false,
          nodeId: node.id,
          nodeType: node.data.nodeType,
          message: `[${testName}][${hookName}] Error en ${node.data.label}`,
          duration: Date.now() - startTime,
          error: errorMessage,
        });
        
        throw error;
      }
    }
  }

  /**
   * Construye las opciones del contexto del navegador basándose en la configuración
   */
  private buildContextOptions(config: Record<string, unknown>): Parameters<Browser['newContext']>[0] {
    // Si hay un dispositivo seleccionado, usar su configuración base
    const deviceName = config.device as string;
    let contextOptions: Parameters<Browser['newContext']>[0] = {};

    if (deviceName && devices[deviceName]) {
      contextOptions = { ...devices[deviceName] };
      console.log(`[Emulation] Usando dispositivo: ${deviceName}`);
    }

    // Viewport personalizado (sobrescribe el del dispositivo)
    const viewportWidth = config.viewportWidth as number;
    const viewportHeight = config.viewportHeight as number;
    if (viewportWidth && viewportHeight) {
      contextOptions.viewport = {
        width: viewportWidth, 
        height: viewportHeight
      };
    } else if (!deviceName) {
      // Viewport por defecto si no hay dispositivo
      contextOptions.viewport = { width: 1280, height: 720 };
    }

    // Device Scale Factor
    const deviceScaleFactor = config.deviceScaleFactor as number;
    if (deviceScaleFactor && deviceScaleFactor > 0) {
      contextOptions.deviceScaleFactor = deviceScaleFactor;
    }

    // Mobile y Touch
    if (typeof config.isMobile === 'boolean') {
      contextOptions.isMobile = config.isMobile;
    }
    if (typeof config.hasTouch === 'boolean') {
      contextOptions.hasTouch = config.hasTouch;
    }

    // Localización
    const locale = config.locale as string;
    if (locale) {
      contextOptions.locale = locale;
    }

    const timezoneId = config.timezoneId as string;
    if (timezoneId) {
      contextOptions.timezoneId = timezoneId;
    }

    // Geolocalización
    const geoLatitude = config.geoLatitude as string;
    const geoLongitude = config.geoLongitude as string;
    if (geoLatitude && geoLongitude) {
      contextOptions.geolocation = {
        latitude: Number.parseFloat(geoLatitude),
        longitude: Number.parseFloat(geoLongitude),
        accuracy: (config.geoAccuracy as number) || 100,
      };
      // Permisos de geolocalización automáticos
      contextOptions.permissions = contextOptions.permissions || [];
      if (!contextOptions.permissions.includes('geolocation')) {
        contextOptions.permissions.push('geolocation');
      }
    }

    // Esquema de color
    const colorScheme = config.colorScheme as 'light' | 'dark' | 'no-preference';
    if (colorScheme) {
      contextOptions.colorScheme = colorScheme;
    }

    // Reduced motion
    const reducedMotion = config.reducedMotion as 'reduce' | 'no-preference';
    if (reducedMotion) {
      contextOptions.reducedMotion = reducedMotion;
    }

    // Forced colors
    const forcedColors = config.forcedColors as 'active' | 'none';
    if (forcedColors) {
      contextOptions.forcedColors = forcedColors;
    }

    // Offline
    if (config.offline === true) {
      contextOptions.offline = true;
    }

    // JavaScript habilitado (por defecto true)
    if (config.javaScriptEnabled === false) {
      contextOptions.javaScriptEnabled = false;
    }

    // User Agent personalizado
    const userAgent = config.userAgent as string;
    if (userAgent?.trim()) {
      contextOptions.userAgent = userAgent.trim();
    }

    // Permisos adicionales
    const permissions = config.permissions as string[];
    if (permissions && permissions.length > 0) {
      contextOptions.permissions = [
        ...(contextOptions.permissions || []),
        ...permissions,
      ];
    }

    return contextOptions;
  }

  /**
   * Inicializa el browser (usado para beforeAll/afterAll)
   * Soporta CDP remoto para ver ejecución en tiempo real
   */
  private async initBrowser(startNode?: FlowNode): Promise<void> {
    const config = startNode?.data.config || {};
    const cdpUrl = this.flowConfig?.cdpUrl || process.env.CDP_URL;
    const baseUrl = config.baseUrl as string;

    // CDP remoto: conectar al browser del usuario
    if (cdpUrl) {
      console.log(`[Executor] Conectando a browser remoto via CDP: ${cdpUrl}`);
      this.browser = await chromium.connectOverCDP(cdpUrl);
    } else {
      // ponytail: always headless - user sees execution via screencast
      this.browser = await chromium.launch({
        headless: true,
        slowMo: this.options.slowMo,
      });
    }

    // Construir opciones del contexto con emulación
    const contextOptions = this.buildContextOptions(config);
    this.context = await this.browser.newContext(contextOptions);

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.options.timeout || 30000);

    // Iniciar screencast si hay callback configurado
    if (this.options.onScreencastFrame) {
      await this.startScreencast();
    }

    if (baseUrl) {
      await this.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    }
  }

  /**
   * Inicia transmisión de frames del navegador via CDP
   */
  private async startScreencast(): Promise<void> {
    if (!this.page) return;
    
    try {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      
      this.cdpSession.on('Page.screencastFrame', (params) => {
        // Enviar frame al callback
        this.options.onScreencastFrame?.(params.data);
        // Confirmar recepción para recibir el siguiente
        this.cdpSession?.send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {});
      });

      await this.cdpSession.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 60,
        maxWidth: 1280,
        maxHeight: 720,
        everyNthFrame: 2, // Reducir framerate para menos tráfico
      });
      
      console.log('[Executor] Screencast iniciado');
    } catch (error) {
      console.warn('[Executor] No se pudo iniciar screencast:', error);
    }
  }

  /**
   * Detiene la transmisión de frames
   */
  private async stopScreencast(): Promise<void> {
    if (this.cdpSession) {
      try {
        await this.cdpSession.send('Page.stopScreencast');
        await this.cdpSession.detach();
      } catch {
        // Ignorar errores al cerrar
      }
      this.cdpSession = null;
    }
  }

  /**
   * Ejecuta un flujo completo
   */
  async execute(flow: TestFlow): Promise<ExecutionStatus> {
    this.status.flowId = flow.id;
    this.flowNodes = flow.nodes;
    this.flowEdges = flow.edges;
    this.flowConfig = flow.config;
    this.updateStatus({ status: 'running', startedAt: new Date() });

    try {
      const tests = this.identifyTests(flow);
      const hooks = this.identifyHooks(flow);
      const config = flow.config;
      
      if (tests.length === 0) {
        throw new Error('No se encontraron nodos de inicio');
      }

      console.log(`Ejecutando ${tests.length} test(s) en modo: ${config?.executionMode || 'default'}`);
      
      if (hooks.beforeAll.length > 0 || hooks.afterAll.length > 0) {
        console.log(`Hooks detectados: beforeAll=${hooks.beforeAll.length}, beforeEach=${hooks.beforeEach.length}, afterEach=${hooks.afterEach.length}, afterAll=${hooks.afterAll.length}`);
      }

      // Ejecutar beforeAll (requiere crear un browser/page temporal)
      if (hooks.beforeAll.length > 0) {
        await this.initBrowser(tests[0]?.startNode);
        if (this.page) {
          await this.executeHookNodes('beforeAll', hooks.beforeAll, this.page);
        }
        await this.cleanup();
      }

      // Determinar modo de ejecución
      const isParallel = config?.executionMode === 'parallel';
      
      if (isParallel && tests.length > 1) {
        // Ejecución paralela
        await this.executeTestsInParallel(tests, config, hooks);
      } else {
        // Ejecución serial (por defecto)
        await this.executeTestsSerially(tests, hooks, config?.retries || 0);
      }

      // Ejecutar afterAll
      if (hooks.afterAll.length > 0) {
        await this.initBrowser(tests[0]?.startNode);
        if (this.page) {
          await this.executeHookNodes('afterAll', hooks.afterAll, this.page);
        }
        await this.cleanup();
      }

      // Verificar si hubo fallos
      const hasFailures = this.status.results.some(r => !r.success);
      this.updateStatus({ 
        status: hasFailures ? 'failed' : 'completed', 
        completedAt: new Date() 
      });

    } catch (error) {
      this.updateStatus({ 
        status: 'failed', 
        completedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return this.status;
  }

  /**
   * Ejecuta tests en serie (uno tras otro)
   */
  private async executeTestsSerially(tests: TestCase[], hooks: HookNodes, retries: number = 0): Promise<void> {
    for (const test of tests) {
      const testName = (test.startNode.data.config.testName as string) || test.startNode.data.label;
      let attempt = 0;
      let success = false;
      
      while (attempt <= retries && !success) {
        if (attempt > 0) {
          console.log(`[Serial] Reintento ${attempt}/${retries} para test: ${testName}`);
        } else {
          console.log(`[Serial] Iniciando test: ${testName}`);
        }
        
        try {
          // Ejecutar beforeEach
          if (hooks.beforeEach.length > 0) {
            await this.executeSingleTest(test, hooks.beforeEach);
          } else {
            await this.executeSingleTest(test);
          }
          
          // Ejecutar afterEach
          if (hooks.afterEach.length > 0 && this.page) {
            await this.executeHookNodes('afterEach', hooks.afterEach, this.page);
          }
          
          console.log(`[Serial] Completado test: ${testName}`);
          success = true;
        } catch (error) {
          console.error(`[Serial] Error en test ${testName} (intento ${attempt + 1}):`, error);
          attempt++;
          
          if (attempt <= retries) {
            // Limpiar resultados del intento fallido antes de reintentar
            this.status.results = this.status.results.filter(r => 
              !test.nodes.some(n => n.id === r.nodeId)
            );
          }
        } finally {
          // Limpiar browser entre tests/reintentos
          await this.cleanup();
        }
      }
    }
  }

  /**
   * Ejecuta tests en paralelo con pool de workers
   */
  private async executeTestsInParallel(tests: TestCase[], config?: ProjectConfig, hooks?: HookNodes): Promise<void> {
    const maxWorkers = config?.workers || 4;
    const maxFailures = config?.maxFailures || 0;
    const maxRetries = config?.retries || 0;
    let failureCount = 0;
    let shouldStop = false;

    console.log(`[Parallel] Ejecutando ${tests.length} tests con ${maxWorkers} workers${maxRetries > 0 ? `, ${maxRetries} reintentos` : ''}`);

    // Pool de tareas pendientes con conteo de intentos
    const pending: Array<{ test: TestCase; attempt: number }> = tests.map(t => ({ test: t, attempt: 0 }));
    const activePromises = new Map<Promise<void>, TestCase>();

    const startNextTest = (): Promise<void> | null => {
      if (shouldStop || pending.length === 0) return null;
      
      const item = pending.shift()!;
      const { test, attempt } = item;
      const testName = (test.startNode.data.config.testName as string) || test.startNode.data.label;
      
      if (attempt > 0) {
        console.log(`[Parallel] Reintento ${attempt}/${maxRetries} para: ${testName}`);
        // Limpiar resultados del intento anterior
        this.status.results = this.status.results.filter(r => 
          !test.nodes.some(n => n.id === r.nodeId)
        );
      }
      
      const promise = this.executeTestInIsolation(test, hooks)
        .then(() => {
          console.log(`[Parallel] ✓ Completado: ${testName}${attempt > 0 ? ` (intento ${attempt + 1})` : ''}`);
        })
        .catch((error) => {
          console.error(`[Parallel] ✗ Fallido: ${testName} (intento ${attempt + 1})`, error);
          
          // Si hay reintentos disponibles, volver a encolar
          if (attempt < maxRetries) {
            console.log(`[Parallel] Reencolando para reintento: ${testName}`);
            pending.push({ test, attempt: attempt + 1 });
          } else {
            // Sin más reintentos, contar como fallo
            failureCount++;
            
            if (maxFailures > 0 && failureCount >= maxFailures) {
              console.log(`[Parallel] Máximo de fallos alcanzado (${maxFailures}), deteniendo...`);
              shouldStop = true;
            }
          }
        })
        .finally(() => {
          activePromises.delete(promise);
        });

      activePromises.set(promise, test);
      return promise;
    };

    // Iniciar workers iniciales
    const initialPromises: Promise<void>[] = [];
    for (let i = 0; i < Math.min(maxWorkers, tests.length); i++) {
      const p = startNextTest();
      if (p) initialPromises.push(p);
    }

    // Procesar tests mientras haya pendientes o activos
    while (activePromises.size > 0 || pending.length > 0) {
      if (activePromises.size === 0) break;
      
      // Esperar a que termine cualquier test
      await Promise.race(activePromises.keys());
      
      // Iniciar siguiente test si hay slots disponibles
      while (activePromises.size < maxWorkers && pending.length > 0 && !shouldStop) {
        startNextTest();
      }
    }

    console.log(`[Parallel] Finalizado. Tests: ${tests.length}, Fallos: ${failureCount}`);
  }

  /**
   * Ejecuta un test en aislamiento (con su propio browser)
   */
  private async executeTestInIsolation(test: TestCase, hooks?: HookNodes): Promise<void> {
    const testName = (test.startNode.data.config.testName as string) || test.startNode.data.label;
    console.log(`[Parallel] Iniciando test aislado: ${testName}`);

    // Crear instancia aislada para este test
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      const config = test.startNode.data.config;
      const cdpUrl = this.flowConfig?.cdpUrl || process.env.CDP_URL;
      const baseUrl = config.baseUrl as string;

      // CDP remoto o local
      if (cdpUrl) {
        browser = await chromium.connectOverCDP(cdpUrl);
      } else {
        // ponytail: always headless - user sees execution via screencast
        browser = await chromium.launch({
          headless: true,
          slowMo: this.options.slowMo,
        });
      }

      // Construir opciones del contexto con emulación
      const contextOptions = this.buildContextOptions(config);
      context = await browser.newContext(contextOptions);

      page = await context.newPage();
      page.setDefaultTimeout(this.options.timeout || 30000);

      if (baseUrl) {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      }

      // Ejecutar beforeEach hooks
      if (hooks?.beforeEach && hooks.beforeEach.length > 0) {
        await this.executeHookNodesWithPage('beforeEach', hooks.beforeEach, page, testName);
      }

      // Ejecutar nodos del test (excluyendo el start que ya procesamos)
      for (const node of test.nodes) {
        if (node.data.nodeType === 'start') continue;

        const startTime = Date.now();
        try {
          await this.executeNodeWithPage(node, page);
          
          this.addResult({
            success: true,
            nodeId: node.id,
            nodeType: node.data.nodeType,
            message: `[${testName}] ${node.data.label} ejecutado correctamente`,
            duration: Date.now() - startTime,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          this.addResult({
            success: false,
            nodeId: node.id,
            nodeType: node.data.nodeType,
            message: `[${testName}] Error en ${node.data.label}`,
            duration: Date.now() - startTime,
            error: errorMessage,
          });
          
          throw error; // Re-lanzar para marcar el test como fallido
        }
      }

      // Ejecutar afterEach hooks
      if (hooks?.afterEach && hooks.afterEach.length > 0) {
        await this.executeHookNodesWithPage('afterEach', hooks.afterEach, page, testName);
      }

      // Agregar resultado de éxito para el test
      this.addResult({
        success: true,
        nodeId: test.startNode.id,
        nodeType: 'test-complete',
        message: `[${testName}] Test completado exitosamente`,
        duration: 0,
      });

      console.log(`[Parallel] Completado test: ${testName}`);

    } catch (error) {
      console.error(`[Parallel] Error en test ${testName}:`, error);
      throw error;
    } finally {
      // Limpiar recursos de este test
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }

  /**
   * Ejecuta un test individual usando el browser compartido de la clase
   */
  private async executeSingleTest(test: TestCase, beforeEachNodes?: FlowNode[]): Promise<void> {
    const testName = (test.startNode.data.config.testName as string) || test.startNode.data.label;
    
    // Verificar si el flujo contiene nodos "if" para usar ejecución dinámica
    if (this.hasIfNodes(test.startNode.id)) {
      // Primero inicializar el browser con el nodo start
      await this.initBrowser(test.startNode);
      if (!this.page) {
        throw new Error('No se pudo inicializar el browser');
      }
      // Usar ejecución dinámica
      await this.executeDynamicFlow(test.startNode.id, testName, this.page, beforeEachNodes);
      return;
    }
    
    // Ejecución tradicional para flujos sin nodos "if"
    for (const node of test.nodes) {
      // Si es el nodo start y hay beforeEach, ejecutarlo después de inicializar el browser
      if (node.data.nodeType === 'start' && beforeEachNodes && beforeEachNodes.length > 0) {
        // Primero ejecutar el start para inicializar el browser
        this.updateStatus({ currentNode: node.id });
        const startTime = Date.now();
        try {
          await this.executeNode(node);
          this.addResult({
            success: true,
            nodeId: node.id,
            nodeType: node.data.nodeType,
            message: `[${testName}] ${node.data.label} ejecutado correctamente`,
            duration: Date.now() - startTime,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.addResult({
            success: false,
            nodeId: node.id,
            nodeType: node.data.nodeType,
            message: `[${testName}] Error en ${node.data.label}`,
            duration: Date.now() - startTime,
            error: errorMessage,
          });
          throw error;
        }
        
        // Luego ejecutar beforeEach
        if (this.page) {
          await this.executeHookNodes('beforeEach', beforeEachNodes, this.page, testName);
        }
        continue;
      }
      
      this.updateStatus({ currentNode: node.id });
      
      const startTime = Date.now();
      try {
        await this.executeNode(node);
        
        this.addResult({
          success: true,
          nodeId: node.id,
          nodeType: node.data.nodeType,
          message: `[${testName}] ${node.data.label} ejecutado correctamente`,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        this.addResult({
          success: false,
          nodeId: node.id,
          nodeType: node.data.nodeType,
          message: `[${testName}] Error en ${node.data.label}`,
          duration: Date.now() - startTime,
          error: errorMessage,
        });

        throw error; // Re-lanzar para que el test se marque como fallido
      }
    }
  }

  /**
   * Ejecuta un nodo con una página específica (para ejecución paralela)
   */
  private async executeNodeWithPage(node: FlowNode, page: Page): Promise<void> {
    const { nodeType, config } = node.data;

    switch (nodeType) {
      case 'navigate':
        await page.goto(config.url as string, { 
          waitUntil: (config.waitUntil as 'load' | 'domcontentloaded' | 'networkidle') || 'load' 
        });
        break;
      case 'click':
        await page.click(this.buildSelector(config), {
          button: (config.button as 'left' | 'right' | 'middle') || 'left',
          clickCount: (config.clickCount as number) || 1,
          delay: (config.delay as number) || 0,
          force: config.force === true,
          timeout: (config.timeout as number) || 30000,
        });
        break;
      case 'fill':
        await page.fill(this.buildSelector(config), config.value as string);
        break;
      case 'type':
        const selector = this.buildSelector(config);
        if (config.clearFirst !== false) {
          await page.fill(selector, '');
        }
        await page.type(selector, config.text as string, {
          delay: (config.delay as number) || 0,
        });
        break;
      case 'check':
        if (config.action === 'uncheck') {
          await page.uncheck(this.buildSelector(config));
        } else {
          await page.check(this.buildSelector(config));
        }
        break;
      case 'select':
        const selectValue = config.value as string;
        const selectBy = config.selectBy as string || 'value';
        if (selectBy === 'label') {
          await page.selectOption(this.buildSelector(config), { label: selectValue });
        } else if (selectBy === 'index') {
          await page.selectOption(this.buildSelector(config), { index: Number.parseInt(selectValue) });
        } else {
          await page.selectOption(this.buildSelector(config), selectValue);
        }
        break;
      case 'hover':
        await page.hover(this.buildSelector(config));
        break;
      case 'focus':
        await page.focus(this.buildSelector(config));
        break;
      case 'wait':
        await page.waitForSelector(this.buildSelector(config), {
          state: (config.state as 'attached' | 'visible' | 'hidden') || 'visible',
          timeout: (config.timeout as number) || 30000,
        });
        break;
      case 'screenshot':
        await page.screenshot({
          path: config.name as string || `screenshot-${Date.now()}.png`,
          fullPage: config.fullPage === true,
        });
        break;
      case 'assertVisible':
        await expect(page.locator(this.buildSelector(config))).toBeVisible();
        break;
      case 'assertHidden':
        await expect(page.locator(this.buildSelector(config))).toBeHidden();
        break;
      case 'assertText':
        const textSelector = this.buildSelector(config);
        const expectedTextValue = config.expectedText as string;
        const textMatchType = config.matchType as string || 'contains';
        const textIgnoreCase = config.ignoreCase === true;
        if (textMatchType === 'exact') {
          await expect(page.locator(textSelector)).toHaveText(expectedTextValue, { ignoreCase: textIgnoreCase });
        } else if (textMatchType === 'regex') {
          await expect(page.locator(textSelector)).toHaveText(new RegExp(expectedTextValue, textIgnoreCase ? 'i' : ''));
        } else {
          await expect(page.locator(textSelector)).toContainText(expectedTextValue, { ignoreCase: textIgnoreCase });
        }
        break;
      case 'assertUrl':
        const expectedUrlValue = config.expectedUrl as string;
        const urlMatchType = config.matchType as string || 'contains';
        if (urlMatchType === 'exact') {
          await expect(page).toHaveURL(expectedUrlValue);
        } else {
          await expect(page).toHaveURL(new RegExp(expectedUrlValue));
        }
        break;
      case 'assertTitle':
        await expect(page).toHaveTitle(config.expectedTitle as string);
        break;
      case 'code':
        // Ejecutar código JavaScript personalizado
        const codeToRun = config.code as string;
        if (codeToRun) {
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const fn = new AsyncFunction('page', 'context', codeToRun);
          await fn(page, page.context());
        }
        break;
      default:
        console.warn(`Tipo de nodo no soportado en paralelo: ${nodeType}`);
    }
  }

  /**
   * Ordena los nodos topológicamente basándose en las conexiones
   */
  private sortNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    // Crear mapa de adyacencia
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(node => {
      adjacency.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    edges.forEach(edge => {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Encontrar nodos sin dependencias (triggers/inicio)
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    const sorted: FlowNode[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (node) sorted.push(node);

      adjacency.get(nodeId)?.forEach(targetId => {
        const newDegree = (inDegree.get(targetId) || 0) - 1;
        inDegree.set(targetId, newDegree);
        if (newDegree === 0) queue.push(targetId);
      });
    }

    return sorted;
  }

  /**
   * Ejecuta un nodo individual
   */
  private async executeNode(node: FlowNode): Promise<void> {
    const { nodeType, config } = node.data;

    switch (nodeType) {
      case 'start':
        await this.executeStart(config);
        break;
      case 'navigate':
        await this.executeNavigate(config);
        break;
      case 'click':
        await this.executeClick(config);
        break;
      case 'dblclick':
        await this.executeDblClick(config);
        break;
      case 'check':
        await this.executeCheck(config);
        break;
      case 'type':
        await this.executeType(config);
        break;
      case 'fill':
        await this.executeFill(config);
        break;
      case 'clear':
        await this.executeClear(config);
        break;
      case 'select':
        await this.executeSelect(config);
        break;
      case 'hover':
        await this.executeHover(config);
        break;
      case 'blur':
        await this.executeBlur(config);
        break;
      case 'focus':
        await this.executeFocus(config);
        break;
      case 'press':
        await this.executePress(config);
        break;
      case 'pressSequentially':
        await this.executePressSequentially(config);
        break;
      case 'selectText':
        await this.executeSelectText(config);
        break;
      case 'setInputFiles':
        await this.executeSetInputFiles(config);
        break;
      case 'tap':
        await this.executeTap(config);
        break;
      case 'dragTo':
        await this.executeDragTo(config);
        break;
      case 'scrollIntoView':
        await this.executeScrollIntoView(config);
        break;
      case 'dispatchEvent':
        await this.executeDispatchEvent(config);
        break;
      case 'waitFor':
        await this.executeWaitFor(config);
        break;
      case 'getAttribute':
        await this.executeGetAttribute(config);
        break;
      case 'inputValue':
        await this.executeInputValue(config);
        break;
      case 'textContent':
        await this.executeTextContent(config);
        break;
      case 'wait':
        await this.executeWait(config);
        break;
      case 'screenshot':
        await this.executeScreenshot(config);
        break;
      case 'assertVisible':
        await this.executeAssertVisible(config);
        break;
      case 'assertHidden':
        await this.executeAssertHidden(config);
        break;
      case 'assertAttached':
        await this.executeAssertAttached(config);
        break;
      case 'assertChecked':
        await this.executeAssertChecked(config);
        break;
      case 'assertEnabled':
        await this.executeAssertEnabled(config);
        break;
      case 'assertDisabled':
        await this.executeAssertDisabled(config);
        break;
      case 'assertEditable':
        await this.executeAssertEditable(config);
        break;
      case 'assertEmpty':
        await this.executeAssertEmpty(config);
        break;
      case 'assertFocused':
        await this.executeAssertFocused(config);
        break;
      case 'assertInViewport':
        await this.executeAssertInViewport(config);
        break;
      case 'assertText':
        await this.executeAssertText(config);
        break;
      case 'assertAttribute':
        await this.executeAssertAttribute(config);
        break;
      case 'assertClass':
        await this.executeAssertClass(config);
        break;
      case 'assertCSS':
        await this.executeAssertCSS(config);
        break;
      case 'assertId':
        await this.executeAssertId(config);
        break;
      case 'assertRole':
        await this.executeAssertRole(config);
        break;
      case 'assertAccessibleName':
        await this.executeAssertAccessibleName(config);
        break;
      case 'assertAccessibleDescription':
        await this.executeAssertAccessibleDescription(config);
        break;
      case 'assertUrl':
        await this.executeAssertUrl(config);
        break;
      case 'assertTitle':
        await this.executeAssertTitle(config);
        break;
      case 'assertValue':
        await this.executeAssertValue(config);
        break;
      case 'assertValues':
        await this.executeAssertValues(config);
        break;
      case 'assertCount':
        await this.executeAssertCount(config);
        break;
      case 'assertScreenshot':
        await this.executeAssertScreenshot(config);
        break;
      case 'code':
        await this.executeCode(config);
        break;
      default:
        console.warn(`Tipo de nodo no soportado: ${nodeType}`);
    }
  }

  // ===============================
  // IMPLEMENTACIÓN DE CADA NODO
  // ===============================

  private async executeStart(config: Record<string, unknown>): Promise<void> {
    const cdpUrl = this.flowConfig?.cdpUrl || process.env.CDP_URL;
    // ponytail: Force headless in Docker (no display available)
    const forceHeadless = process.env.FORCE_HEADLESS === 'true';
    const headless = forceHeadless || (typeof config.headless === 'boolean' 
      ? config.headless 
      : (this.options.headless ?? true));
    const baseUrl = config.baseUrl as string;

    try {
      if (cdpUrl) {
        console.log(`[Executor] Conectando a browser remoto via CDP: ${cdpUrl}`);
        this.browser = await chromium.connectOverCDP(cdpUrl);
      } else {
        console.log(`[Executor] Lanzando chromium (headless: ${headless})...`);
        this.browser = await chromium.launch({
          headless,
          slowMo: this.options.slowMo,
        });
      }
      console.log(`[Executor] Browser listo`);

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      console.log(`[Executor] Contexto creado`);

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.options.timeout || 30000);
      console.log(`[Executor] Página creada`);

      // Iniciar screencast si hay callback configurado
      if (this.options.onScreencastFrame) {
        await this.startScreencast();
      }

      if (baseUrl) {
        await this.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        console.log(`[Executor] Navegado a ${baseUrl}`);
      }
    } catch (error) {
      console.error(`[Executor] Error inicializando browser:`, error);
      throw error;
    }
  }

  private async executeNavigate(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const url = config.url as string;
    const waitUntil = config.waitUntil as 'load' | 'domcontentloaded' | 'networkidle' || 'load';
    
    await this.page.goto(url, { waitUntil });
  }

  private async executeClick(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const button = (config.button as 'left' | 'right' | 'middle') || 'left';
    const clickCount = (config.clickCount as number) || 1;
    const delay = (config.delay as number) || 0;
    const force = config.force === true;
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.click(selector, { button, clickCount, delay, force, timeout });
  }

  private async executeCheck(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const action = config.action as string || 'check';
    const force = config.force === true;
    const timeout = (config.timeout as number) || 30000;
    
    if (action === 'uncheck') {
      await this.page.uncheck(selector, { force, timeout });
    } else {
      await this.page.check(selector, { force, timeout });
    }
  }

  private async executeType(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const text = config.text as string;
    const clearFirst = config.clearFirst !== false;
    
    if (clearFirst) {
      await this.page.fill(selector, '');
    }
    
    await this.page.fill(selector, text);
  }

  private async executeFill(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const value = config.value as string;
    
    await this.page.fill(selector, value);
  }

  private async executeSelect(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const value = config.value as string;
    const selectBy = config.selectBy as string || 'value';
    
    if (selectBy === 'label') {
      await this.page.selectOption(selector, { label: value });
    } else if (selectBy === 'index') {
      await this.page.selectOption(selector, { index: Number.parseInt(value) });
    } else {
      await this.page.selectOption(selector, value);
    }
  }

  private async executeHover(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    await this.page.hover(selector);
  }

  private async executeWait(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const waitType = config.waitType as string;
    const value = config.value as string;
    const timeout = (config.timeout as number) || 30000;
    
    switch (waitType) {
      case 'time':
        await this.page.waitForTimeout(Number.parseInt(value));
        break;
      case 'selector':
        await this.page.waitForSelector(value, { state: 'visible', timeout });
        break;
      case 'hidden':
        await this.page.waitForSelector(value, { state: 'hidden', timeout });
        break;
      case 'networkidle':
        await this.page.waitForLoadState('networkidle', { timeout });
        break;
    }
  }

  private async executeScreenshot(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const name = config.name as string || `screenshot-${Date.now()}`;
    const fullPage = config.fullPage === true;
    
    const options: { path: string; fullPage?: boolean } = {
      path: `screenshots/${name}.png`,
    };
    
    // Prioridad: fullPage > selector > viewport
    if (fullPage) {
      // Página completa - ignora cualquier selector
      options.fullPage = true;
      await this.page.screenshot(options);
    } else if (config.selector) {
      // Capturar solo un elemento específico
      const selector = this.buildSelector(config);
      const locator = this.page.locator(selector);
      await locator.screenshot({ path: options.path });
    } else {
      // Capturar viewport actual
      await this.page.screenshot(options);
    }
  }

  private async executeAssertVisible(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const negate = config.negate === true;
    const timeout = (config.timeout as number) || 5000;
    
    if (negate) {
      await expect(this.page.locator(selector)).not.toBeVisible({ timeout });
    } else {
      await expect(this.page.locator(selector)).toBeVisible({ timeout });
    }
  }

  private async executeAssertText(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const expectedText = config.expectedText as string;
    const matchType = config.matchType as string || 'contains';
    const ignoreCase = config.ignoreCase === true;
    const timeout = (config.timeout as number) || 5000;
    
    const locator = this.page.locator(selector);
    
    switch (matchType) {
      case 'exact':
        await expect(locator).toHaveText(expectedText, { ignoreCase, timeout });
        break;
      case 'contains':
        await expect(locator).toContainText(expectedText, { ignoreCase, timeout });
        break;
      case 'regex':
        await expect(locator).toHaveText(new RegExp(expectedText, ignoreCase ? 'i' : ''), { timeout });
        break;
    }
  }

  private async executeAssertUrl(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const expectedUrl = config.expectedUrl as string;
    const matchType = config.matchType as string || 'contains';
    const timeout = (config.timeout as number) || 5000;
    
    switch (matchType) {
      case 'exact':
        await expect(this.page).toHaveURL(expectedUrl, { timeout });
        break;
      case 'contains':
        await expect(this.page).toHaveURL(new RegExp(expectedUrl.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)), { timeout });
        break;
      case 'regex':
        await expect(this.page).toHaveURL(new RegExp(expectedUrl), { timeout });
        break;
    }
  }

  private async executeAssertValue(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const expectedValue = config.expectedValue as string;
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toHaveValue(expectedValue, { timeout });
  }

  private async executeAssertCount(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const expectedCount = config.expectedCount as number;
    const comparison = config.comparison as string || 'equal';
    const timeout = (config.timeout as number) || 5000;
    
    const locator = this.page.locator(selector);
    
    // Para comparaciones simples de igualdad, usamos toHaveCount
    if (comparison === 'equal') {
      await expect(locator).toHaveCount(expectedCount, { timeout });
      return;
    }
    
    // Para otras comparaciones, verificamos manualmente
    const actualCount = await locator.count();
    
    let matches = false;
    switch (comparison) {
      case 'greaterThan':
        matches = actualCount > expectedCount;
        break;
      case 'lessThan':
        matches = actualCount < expectedCount;
        break;
      case 'greaterOrEqual':
        matches = actualCount >= expectedCount;
        break;
      case 'lessOrEqual':
        matches = actualCount <= expectedCount;
        break;
    }
    
    if (!matches) {
      throw new Error(
        `Cantidad no coincide (${comparison}). Esperado: ${expectedCount}, Actual: ${actualCount}`
      );
    }
  }

  // ===============================
  // NUEVAS ASERCIONES DE PLAYWRIGHT
  // ===============================

  private async executeAssertHidden(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toBeHidden({ timeout });
  }

  private async executeAssertAttached(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const attached = config.attached !== 'false';
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toBeAttached({ attached, timeout });
  }

  private async executeAssertChecked(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const checked = config.checked !== 'false';
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toBeChecked({ checked, timeout });
  }

  private async executeAssertEnabled(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toBeEnabled({ timeout });
  }

  private async executeAssertDisabled(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toBeDisabled({ timeout });
  }

  private async executeAssertEditable(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const editable = config.editable !== 'false';
    const timeout = (config.timeout as number) || 5000;
    
    if (editable) {
      await expect(this.page.locator(selector)).toBeEditable({ timeout });
    } else {
      await expect(this.page.locator(selector)).not.toBeEditable({ timeout });
    }
  }

  private async executeAssertEmpty(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toBeEmpty({ timeout });
  }

  private async executeAssertFocused(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toBeFocused({ timeout });
  }

  private async executeAssertInViewport(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const ratio = (config.ratio as number) || 0;
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toBeInViewport({ ratio, timeout });
  }

  private async executeAssertAttribute(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const attribute = config.attribute as string;
    const expectedValue = config.expectedValue as string;
    const timeout = (config.timeout as number) || 5000;
    
    if (expectedValue) {
      await expect(this.page.locator(selector)).toHaveAttribute(attribute, expectedValue, { timeout });
    } else {
      // Solo verifica que el atributo existe
      await expect(this.page.locator(selector)).toHaveAttribute(attribute, { timeout });
    }
  }

  private async executeAssertClass(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const expectedClass = config.expectedClass as string;
    const matchType = config.matchType as string || 'contains';
    const timeout = (config.timeout as number) || 5000;
    
    if (matchType === 'contains') {
      await expect(this.page.locator(selector)).toHaveClass(new RegExp(expectedClass), { timeout });
    } else {
      await expect(this.page.locator(selector)).toHaveClass(expectedClass, { timeout });
    }
  }

  private async executeAssertCSS(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const cssProperty = config.cssProperty as string;
    const expectedValue = config.expectedValue as string;
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toHaveCSS(cssProperty, expectedValue, { timeout });
  }

  private async executeAssertId(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const expectedId = config.expectedId as string;
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toHaveId(expectedId, { timeout });
  }

  private async executeAssertRole(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const expectedRole = config.expectedRole as 
      | 'alert' | 'alertdialog' | 'application' | 'article' | 'banner' | 'blockquote' 
      | 'button' | 'caption' | 'cell' | 'checkbox' | 'code' | 'columnheader' 
      | 'combobox' | 'complementary' | 'contentinfo' | 'definition' | 'deletion' 
      | 'dialog' | 'directory' | 'document' | 'emphasis' | 'feed' | 'figure' 
      | 'form' | 'generic' | 'grid' | 'gridcell' | 'group' | 'heading' | 'img' 
      | 'insertion' | 'link' | 'list' | 'listbox' | 'listitem' | 'log' | 'main' 
      | 'marquee' | 'math' | 'menu' | 'menubar' | 'menuitem' | 'menuitemcheckbox' 
      | 'menuitemradio' | 'meter' | 'navigation' | 'none' | 'note' | 'option' 
      | 'paragraph' | 'presentation' | 'progressbar' | 'radio' | 'radiogroup' 
      | 'region' | 'row' | 'rowgroup' | 'rowheader' | 'scrollbar' | 'search' 
      | 'searchbox' | 'separator' | 'slider' | 'spinbutton' | 'status' | 'strong' 
      | 'subscript' | 'superscript' | 'switch' | 'tab' | 'table' | 'tablist' 
      | 'tabpanel' | 'term' | 'textbox' | 'time' | 'timer' | 'toolbar' | 'tooltip' 
      | 'tree' | 'treegrid' | 'treeitem';
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toHaveRole(expectedRole, { timeout });
  }

  private async executeAssertAccessibleName(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const expectedName = config.expectedName as string;
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toHaveAccessibleName(expectedName, { timeout });
  }

  private async executeAssertAccessibleDescription(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const expectedDescription = config.expectedDescription as string;
    const timeout = (config.timeout as number) || 5000;
    
    await expect(this.page.locator(selector)).toHaveAccessibleDescription(expectedDescription, { timeout });
  }

  private async executeAssertTitle(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const expectedTitle = config.expectedTitle as string;
    const matchType = config.matchType as string || 'contains';
    const timeout = (config.timeout as number) || 5000;
    
    if (matchType === 'regex') {
      await expect(this.page).toHaveTitle(new RegExp(expectedTitle), { timeout });
    } else if (matchType === 'contains') {
      await expect(this.page).toHaveTitle(new RegExp(expectedTitle), { timeout });
    } else {
      await expect(this.page).toHaveTitle(expectedTitle, { timeout });
    }
  }

  private async executeAssertValues(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const expectedValuesStr = config.expectedValues as string;
    const timeout = (config.timeout as number) || 5000;
    
    const expectedValues = expectedValuesStr.split(',').map(v => v.trim());
    await expect(this.page.locator(selector)).toHaveValues(expectedValues, { timeout });
  }

  private async executeAssertScreenshot(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = config.selector as string;
    const screenshotName = config.screenshotName as string;
    const maxDiffPixels = (config.maxDiffPixels as number) || 0;
    const maxDiffPixelRatio = (config.maxDiffPixelRatio as number) || 0;
    const timeout = (config.timeout as number) || 5000;
    
    const options: { name: string; maxDiffPixels?: number; maxDiffPixelRatio?: number; timeout?: number } = {
      name: `${screenshotName}.png`,
      timeout,
    };
    
    if (maxDiffPixels > 0) options.maxDiffPixels = maxDiffPixels;
    if (maxDiffPixelRatio > 0) options.maxDiffPixelRatio = maxDiffPixelRatio;
    
    if (selector) {
      await expect(this.page.locator(selector)).toHaveScreenshot(options.name, options);
    } else {
      await expect(this.page).toHaveScreenshot(options.name, options);
    }
  }

  private async executeCode(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const code = config.code as string;
    if (!code) {
      console.warn('Nodo de código sin código para ejecutar');
      return;
    }

    try {
      // Crear una función async que tenga acceso a page, context, y browser
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction('page', 'context', 'browser', code);
      
      if (config.awaitResult === false) {
        fn(this.page, this.context, this.browser);
      } else {
        await fn(this.page, this.context, this.browser);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error ejecutando código JavaScript: ${errorMessage}`);
    }
  }

  // ===============================
  // NUEVAS ACCIONES DE PLAYWRIGHT
  // ===============================

  private async executeDblClick(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const button = (config.button as 'left' | 'right' | 'middle') || 'left';
    const delay = (config.delay as number) || 0;
    const force = config.force === true;
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.dblclick(selector, { button, delay, force, timeout });
  }

  private async executeClear(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const force = config.force === true;
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).clear({ force, timeout });
  }

  private async executeBlur(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).blur({ timeout });
  }

  private async executeFocus(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).focus({ timeout });
  }

  private async executePress(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const key = (config.customKey as string) || (config.key as string) || 'Enter';
    const delay = (config.delay as number) || 0;
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).press(key, { delay, timeout });
  }

  private async executePressSequentially(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const text = config.text as string;
    const delay = (config.delay as number) || 50;
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).pressSequentially(text, { delay, timeout });
  }

  private async executeSelectText(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const force = config.force === true;
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).selectText({ force, timeout });
  }

  private async executeSetInputFiles(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const filePath = config.filePath as string;
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).setInputFiles(filePath, { timeout });
  }

  private async executeTap(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const force = config.force === true;
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).tap({ force, timeout });
  }

  private async executeDragTo(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const sourceSelector = config.sourceSelector as string;
    const targetSelector = config.targetSelector as string;
    const force = config.force === true;
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(sourceSelector).dragTo(
      this.page.locator(targetSelector), 
      { force, timeout }
    );
  }

  private async executeScrollIntoView(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).scrollIntoViewIfNeeded({ timeout });
  }

  private async executeDispatchEvent(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const eventType = config.eventType as string || 'click';
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).dispatchEvent(eventType, undefined, { timeout });
  }

  private async executeWaitFor(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const state = (config.state as 'visible' | 'hidden' | 'attached' | 'detached') || 'visible';
    const timeout = (config.timeout as number) || 30000;
    
    await this.page.locator(selector).waitFor({ state, timeout });
  }

  private async executeGetAttribute(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const attribute = config.attribute as string;
    const variableName = config.variableName as string;
    const timeout = (config.timeout as number) || 30000;
    
    const value = await this.page.locator(selector).getAttribute(attribute, { timeout });
    
    // Guardar en variables si se especificó nombre
    if (variableName && value) {
      (this as Record<string, unknown>)[`var_${variableName}`] = value;
    }
  }

  private async executeInputValue(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const variableName = config.variableName as string;
    const timeout = (config.timeout as number) || 30000;
    
    const value = await this.page.locator(selector).inputValue({ timeout });
    
    if (variableName) {
      (this as Record<string, unknown>)[`var_${variableName}`] = value;
    }
  }

  private async executeTextContent(config: Record<string, unknown>): Promise<void> {
    if (!this.page) throw new Error('Browser no inicializado');
    
    const selector = this.buildSelector(config);
    const variableName = config.variableName as string;
    const timeout = (config.timeout as number) || 30000;
    
    const value = await this.page.locator(selector).textContent({ timeout });
    
    if (variableName && value) {
      (this as Record<string, unknown>)[`var_${variableName}`] = value;
    }
  }

  /**
   * Construye el selector basado en el tipo de selector configurado
   */
  private buildSelector(config: Record<string, unknown>): string {
    const selector = config.selector as string;
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
        // Si ya tiene formato de rol (ej: button[name="Copy"]), agregar prefijo
        // Si es solo el nombre del rol (ej: button), agregar prefijo
        return `role=${selector}`;
      case 'testId':
        return `[data-testid="${selector}"]`;
      case 'auto':
        // Auto-detectar basado en el formato del selector
        if (selector.startsWith('//') || selector.startsWith('(//')) {
          return `xpath=${selector}`;
        }
        if (selector.match(/^[a-z]+\[/i) || selector.match(/^[a-z]+$/i)) {
          // Parece un selector de rol (ej: button[name="x"] o button)
          return `role=${selector}`;
        }
        return selector; // Asumir CSS por defecto
      default:
        return selector;
    }
  }

  /**
   * Limpia los recursos del browser
   */
  private async cleanup(): Promise<void> {
    // Detener screencast primero
    await this.stopScreencast();
    
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  getExecutionId(): string {
    return this.executionId;
  }

  getStatus(): ExecutionStatus {
    return this.status;
  }
}
