import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { v4 as uuidv4 } from 'uuid';

export interface PickerSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  status: 'active' | 'selecting' | 'completed' | 'cancelled';
  selectedSelector?: string;
  selectedElement?: {
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    attributes: Record<string, string>;
  };
}

export interface PickerResult {
  selector: string;
  selectorType: 'css' | 'xpath' | 'text' | 'role' | 'testId';
  element: {
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    rect: { x: number; y: number; width: number; height: number };
  };
  alternatives: Array<{
    selector: string;
    type: string;
    confidence: number;
  }>;
}

// Script que se inyecta en la página para el selector visual
const PICKER_SCRIPT = `
(function() {
  // Evitar múltiples inyecciones
  if (window.__qaFlowPickerActive) return;
  window.__qaFlowPickerActive = true;

  let currentHighlight = null;
  let overlay = null;
  let tooltip = null;

  // Crear overlay
  overlay = document.createElement('div');
  overlay.id = '__qaflow-picker-overlay';
  overlay.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483646;
    pointer-events: none;
  \`;
  document.body.appendChild(overlay);

  // Crear highlight box
  currentHighlight = document.createElement('div');
  currentHighlight.id = '__qaflow-picker-highlight';
  currentHighlight.style.cssText = \`
    position: fixed;
    border: 2px solid #6366f1;
    background: rgba(99, 102, 241, 0.1);
    pointer-events: none;
    z-index: 2147483647;
    transition: all 0.1s ease;
    display: none;
  \`;
  document.body.appendChild(currentHighlight);

  // Crear tooltip
  tooltip = document.createElement('div');
  tooltip.id = '__qaflow-picker-tooltip';
  tooltip.style.cssText = \`
    position: fixed;
    background: #1e1e2e;
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 12px;
    z-index: 2147483647;
    pointer-events: none;
    max-width: 400px;
    word-break: break-all;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: none;
  \`;
  document.body.appendChild(tooltip);

  // Crear badge de instrucciones (pequeño, esquina inferior)
  const banner = document.createElement('div');
  banner.id = '__qaflow-picker-banner';
  banner.innerHTML = '🎯 Clic para seleccionar • ESC cancelar';
  banner.style.cssText = \`
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e1e2e;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    pointer-events: none;
  \`;
  document.body.appendChild(banner);

  // Generar selectores para un elemento
  function generateSelectors(element) {
    const selectors = [];
    
    // Por ID
    if (element.id) {
      selectors.push({
        selector: '#' + element.id,
        type: 'css',
        confidence: 95
      });
    }
    
    // Por data-testid
    const testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');
    if (testId) {
      selectors.push({
        selector: testId,
        type: 'testId',
        confidence: 100
      });
    }
    
    // Por role + nombre
    const role = element.getAttribute('role') || getImplicitRole(element);
    const ariaLabel = element.getAttribute('aria-label');
    if (role && ariaLabel) {
      selectors.push({
        selector: role + '[name="' + ariaLabel + '"]',
        type: 'role',
        confidence: 90
      });
    } else if (role) {
      selectors.push({
        selector: role,
        type: 'role',
        confidence: 70
      });
    }
    
    // Por texto visible (para botones, links, etc.)
    const text = element.textContent?.trim();
    if (text && text.length < 50 && ['A', 'BUTTON', 'LABEL', 'SPAN'].includes(element.tagName)) {
      selectors.push({
        selector: text,
        type: 'text',
        confidence: 85
      });
    }
    
    // Por placeholder
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) {
      selectors.push({
        selector: '[placeholder="' + placeholder + '"]',
        type: 'css',
        confidence: 80
      });
    }
    
    // Por name attribute
    const name = element.getAttribute('name');
    if (name) {
      selectors.push({
        selector: '[name="' + name + '"]',
        type: 'css',
        confidence: 75
      });
    }
    
    // Por clase única (si es corta y específica)
    const classes = Array.from(element.classList).filter(c => 
      !c.match(/^(hover|active|focus|disabled|selected|checked)/) &&
      c.length < 30
    );
    if (classes.length > 0 && classes.length <= 2) {
      selectors.push({
        selector: '.' + classes.join('.'),
        type: 'css',
        confidence: 60
      });
    }
    
    // XPath como fallback
    const xpath = getXPath(element);
    selectors.push({
      selector: xpath,
      type: 'xpath',
      confidence: 40
    });
    
    // Ordenar por confianza
    return selectors.sort((a, b) => b.confidence - a.confidence);
  }
  
  function getImplicitRole(element) {
    const tagRoles = {
      'BUTTON': 'button',
      'A': 'link',
      'INPUT': element.type === 'checkbox' ? 'checkbox' : 
               element.type === 'radio' ? 'radio' : 
               element.type === 'submit' ? 'button' : null,
      'SELECT': 'combobox',
      'TEXTAREA': 'textbox',
      'IMG': 'img',
      'NAV': 'navigation',
      'MAIN': 'main',
      'HEADER': 'banner',
      'FOOTER': 'contentinfo',
      'ARTICLE': 'article',
      'ASIDE': 'complementary',
      'DIALOG': 'dialog',
      'FORM': 'form',
      'TABLE': 'table',
      'UL': 'list',
      'OL': 'list',
      'LI': 'listitem'
    };
    return tagRoles[element.tagName] || null;
  }
  
  function getXPath(element) {
    if (element.id) return '//*[@id="' + element.id + '"]';
    
    const parts = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      const part = index > 1 ? tagName + '[' + index + ']' : tagName;
      parts.unshift(part);
      
      if (current.parentElement === document.body) {
        parts.unshift('body');
        break;
      }
      current = current.parentElement;
    }
    
    return '//' + parts.join('/');
  }

  // Manejar hover
  function handleMouseMove(e) {
    const target = e.target;
    
    // Ignorar elementos del picker
    if (target.id?.startsWith('__qaflow-picker')) return;
    
    const rect = target.getBoundingClientRect();
    
    // Actualizar highlight
    currentHighlight.style.display = 'block';
    currentHighlight.style.top = rect.top + 'px';
    currentHighlight.style.left = rect.left + 'px';
    currentHighlight.style.width = rect.width + 'px';
    currentHighlight.style.height = rect.height + 'px';
    
    // Actualizar tooltip
    const selectors = generateSelectors(target);
    const bestSelector = selectors[0];
    
    tooltip.style.display = 'block';
    tooltip.innerHTML = \`
      <div style="color: #a5b4fc; margin-bottom: 4px;">\${target.tagName.toLowerCase()}</div>
      <div style="color: #22c55e;">\${bestSelector.type}: \${bestSelector.selector}</div>
    \`;
    
    // Posicionar tooltip
    let tooltipTop = rect.bottom + 8;
    let tooltipLeft = rect.left;
    
    if (tooltipTop + 60 > window.innerHeight) {
      tooltipTop = rect.top - 60;
    }
    if (tooltipLeft + 300 > window.innerWidth) {
      tooltipLeft = window.innerWidth - 310;
    }
    
    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = tooltipLeft + 'px';
  }

  // Manejar click
  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const target = e.target;
    
    // Ignorar elementos del picker
    if (target.id?.startsWith('__qaflow-picker')) return;
    
    const rect = target.getBoundingClientRect();
    const selectors = generateSelectors(target);
    
    // Enviar resultado
    const result = {
      selector: selectors[0].selector,
      selectorType: selectors[0].type,
      element: {
        tagName: target.tagName.toLowerCase(),
        id: target.id || undefined,
        className: target.className || undefined,
        text: target.textContent?.trim().substring(0, 100) || undefined,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      },
      alternatives: selectors.slice(0, 5)
    };
    
    // Enviar a través de console para que Playwright lo capture
    console.log('__QAFLOW_PICKER_RESULT__' + JSON.stringify(result));
    
    cleanup();
  }

  // Manejar ESC
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      console.log('__QAFLOW_PICKER_CANCELLED__');
      cleanup();
    }
  }

  // Limpiar
  function cleanup() {
    window.__qaFlowPickerActive = false;
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    overlay?.remove();
    currentHighlight?.remove();
    tooltip?.remove();
    banner?.remove();
  }

  // Activar listeners
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
})();
`;

// ponytail: Types for flow nodes to execute before picker
interface FlowNode {
  id: string;
  data: {
    nodeType: string;
    label: string;
    config: Record<string, unknown>;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

class PickerService {
  private readonly sessions: Map<string, PickerSession> = new Map();

  /**
   * Get path from start node to target node
   */
  private getPathToNode(targetId: string, nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    const startNode = nodes.find(n => n.data.nodeType === 'start');
    if (!startNode) return [];
    
    // BFS to find path
    const visited = new Map<string, string | null>(); // nodeId -> parentId
    const queue = [startNode.id];
    visited.set(startNode.id, null);
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === targetId) break;
      
      const outEdges = edges.filter(e => e.source === currentId);
      for (const edge of outEdges) {
        if (!visited.has(edge.target)) {
          visited.set(edge.target, currentId);
          queue.push(edge.target);
        }
      }
    }
    
    // Reconstruct path (excluding target node)
    const path: FlowNode[] = [];
    let current: string | null | undefined = visited.has(targetId) ? visited.get(targetId) : null;
    
    while (current) {
      const node = nodes.find(n => n.id === current);
      if (node) path.unshift(node);
      current = visited.get(current);
    }
    
    // Add start node at beginning if not already there
    if (path.length > 0 && path[0].data.nodeType !== 'start' && startNode) {
      path.unshift(startNode);
    } else if (path.length === 0 && startNode) {
      path.push(startNode);
    }
    
    return path;
  }

  /**
   * Build selector string from config
   */
  private buildSelector(config: Record<string, unknown>): string {
    const selectorType = config.selectorType as string || 'css';
    const selector = config.selector as string;
    
    if (!selector) return '';
    
    switch (selectorType) {
      case 'text': return `text=${selector}`;
      case 'role': return `role=${selector}`;
      case 'testId': return `data-testid=${selector}`;
      case 'xpath': return `xpath=${selector}`;
      default: return selector;
    }
  }

  /**
   * Execute a single node action on page
   */
  private async executeNodeAction(node: FlowNode, page: Page): Promise<void> {
    const { nodeType, config } = node.data;
    
    switch (nodeType) {
      case 'start':
        // Start node: navigate to baseUrl
        if (config.baseUrl) {
          await page.goto(config.baseUrl as string, { waitUntil: 'domcontentloaded' });
        }
        break;
      case 'navigate':
        await page.goto(config.url as string, { waitUntil: 'domcontentloaded' });
        break;
      case 'click':
        await page.click(this.buildSelector(config), { timeout: 10000 });
        break;
      case 'fill':
        await page.fill(this.buildSelector(config), config.value as string);
        break;
      case 'type':
        const selector = this.buildSelector(config);
        if (config.clearFirst !== false) {
          await page.fill(selector, '');
        }
        await page.type(selector, config.text as string);
        break;
      case 'wait':
        await page.waitForTimeout((config.duration as number) || 1000);
        break;
      case 'hover':
        await page.hover(this.buildSelector(config));
        break;
      case 'select':
        await page.selectOption(this.buildSelector(config), config.value as string);
        break;
      case 'press':
        await page.keyboard.press(config.key as string);
        break;
      case 'scroll':
        if (config.selector) {
          await page.locator(this.buildSelector(config)).scrollIntoViewIfNeeded();
        } else {
          await page.evaluate(`window.scrollBy(0, ${config.pixels || 300})`);
        }
        break;
      // Skip assertion nodes - they don't change page state
      case 'expect-text':
      case 'expect-visible':
      case 'expect-url':
      case 'expect-attribute':
      case 'screenshot':
        break;
      default:
        console.log(`[Picker] Skipping unsupported node type: ${nodeType}`);
    }
  }

  /**
   * Start picker with previous nodes execution
   * Supports CDP for Docker environments
   */
  async startSessionWithFlow(
    targetNodeId: string,
    nodes: FlowNode[],
    edges: FlowEdge[],
    onResult: (result: PickerResult | null) => void,
    onProgress?: (message: string) => void,
    cdpUrl?: string
  ): Promise<string> {
    const sessionId = uuidv4();
    
    // Get nodes to execute before picker
    const pathNodes = this.getPathToNode(targetNodeId, nodes, edges);
    const startNode = pathNodes.find(n => n.data.nodeType === 'start');
    
    if (!startNode?.data.config.baseUrl) {
      throw new Error('No se encontró URL base en el nodo de inicio');
    }

    // Check for CDP URL (from param, startNode config, or env)
    const effectiveCdpUrl = cdpUrl || process.env.CDP_URL;

    let browser: Browser;
    let context: BrowserContext;
    let page: Page;

    if (effectiveCdpUrl) {
      // CDP mode: connect to user's Chrome
      onProgress?.(`Conectando a Chrome via CDP...`);
      
      try {
        browser = await chromium.connectOverCDP(effectiveCdpUrl);
        // Get existing context or create new one
        const contexts = browser.contexts();
        if (contexts.length > 0) {
          context = contexts[0];
          // Create new page in existing context
          page = await context.newPage();
        } else {
          context = await browser.newContext({ viewport: null });
          page = await context.newPage();
        }
      } catch (error) {
        throw new Error(`No se pudo conectar a Chrome en ${effectiveCdpUrl}. Asegúrate de tener Chrome abierto con --remote-debugging-port=9222`);
      }
    } else {
      // ponytail: try GUI mode, if fails (no display/Docker) frontend uses interactive picker
      onProgress?.(`Iniciando navegador...`);
      
      browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
      });

      context = await browser.newContext({
        viewport: null,
      });

      page = await context.newPage();
    }

    page.setDefaultTimeout(15000);

    // Listen for picker results
    page.on('console', async (msg) => {
      const text = msg.text();
      
      if (text.startsWith('__QAFLOW_PICKER_RESULT__')) {
        try {
          const jsonStr = text.replace('__QAFLOW_PICKER_RESULT__', '');
          const result = JSON.parse(jsonStr) as PickerResult;
          
          const session = this.sessions.get(sessionId);
          if (session) {
            session.status = 'completed';
            session.selectedSelector = result.selector;
          }
          
          onResult(result);
          setTimeout(() => this.closeSession(sessionId), 500);
        } catch (error) {
          console.error('Error parsing picker result:', error);
        }
      } else if (text === '__QAFLOW_PICKER_CANCELLED__') {
        onResult(null);
        this.closeSession(sessionId);
      }
    });

    // Execute path nodes
    try {
      for (let i = 0; i < pathNodes.length; i++) {
        const node = pathNodes[i];
        onProgress?.(`Ejecutando: ${node.data.label} (${i + 1}/${pathNodes.length})`);
        await this.executeNodeAction(node, page);
        // Small delay between nodes for stability
        await page.waitForTimeout(100);
      }
      
      onProgress?.(`Listo. Selecciona un elemento.`);
    } catch (error) {
      console.error('Error executing path nodes:', error);
      await browser.close();
      throw new Error(`Error ejecutando nodos: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Inject picker script
    await page.evaluate(PICKER_SCRIPT);

    // Save session
    const session: PickerSession = {
      id: sessionId,
      browser,
      context,
      page,
      status: 'selecting',
    };
    this.sessions.set(sessionId, session);

    // Handle browser close
    browser.on('disconnected', () => {
      const session = this.sessions.get(sessionId);
      if (session?.status === 'selecting') {
        onResult(null);
      }
      this.sessions.delete(sessionId);
    });

    return sessionId;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'cancelled';
      try {
        await session.browser.close();
      } catch {
        // Browser ya cerrado
      }
      this.sessions.delete(sessionId);
    }
  }

  getSession(sessionId: string): PickerSession | undefined {
    return this.sessions.get(sessionId);
  }

  async closeAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.closeSession(sessionId);
    }
  }

  /**
   * Start interactive picker session with screencast (works in Docker)
   * No external configuration needed - uses headless browser with CDP
   */
  async startInteractiveSession(
    targetNodeId: string,
    nodes: FlowNode[],
    edges: FlowEdge[],
    onScreencastFrame: (frameBase64: string) => void,
    onResult: (result: PickerResult | null) => void,
    onProgress?: (message: string) => void
  ): Promise<string> {
    const sessionId = uuidv4();
    
    const pathNodes = this.getPathToNode(targetNodeId, nodes, edges);
    const startNode = pathNodes.find(n => n.data.nodeType === 'start');
    
    if (!startNode?.data.config.baseUrl) {
      throw new Error('No se encontró URL base en el nodo de inicio');
    }

    onProgress?.('Iniciando navegador...');
    
    // Always headless for Docker compatibility
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    // Execute path nodes
    try {
      for (let i = 0; i < pathNodes.length; i++) {
        const node = pathNodes[i];
        onProgress?.(`Ejecutando: ${node.data.label} (${i + 1}/${pathNodes.length})`);
        await this.executeNodeAction(node, page);
        await page.waitForTimeout(100);
      }
      onProgress?.('Listo. Click sobre un elemento para seleccionarlo.');
    } catch (error) {
      await browser.close();
      throw new Error(`Error ejecutando nodos: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Start screencast via CDP
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('DOM.enable');
    await cdpSession.send('Page.enable');
    
    cdpSession.on('Page.screencastFrame', async (params) => {
      await cdpSession.send('Page.screencastFrameAck', { sessionId: params.sessionId });
      onScreencastFrame(params.data);
    });
    
    await cdpSession.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 70,
      maxWidth: 1280,
      maxHeight: 720,
      everyNthFrame: 2,
    });

    // Store session with CDP session for coordinate selection
    const session: PickerSession & { cdpSession?: typeof cdpSession; onResult?: typeof onResult } = {
      id: sessionId,
      browser,
      context,
      page,
      status: 'selecting',
      cdpSession,
      onResult,
    };
    this.sessions.set(sessionId, session as PickerSession);

    browser.on('disconnected', () => {
      const sess = this.sessions.get(sessionId);
      if (sess?.status === 'selecting') {
        onResult(null);
      }
      this.sessions.delete(sessionId);
    });

    return sessionId;
  }

  /**
   * Select element at given coordinates (called when user clicks on screencast)
   */
  async selectAtCoordinates(sessionId: string, x: number, y: number): Promise<PickerResult | null> {
    const session = this.sessions.get(sessionId) as PickerSession & { 
      cdpSession?: { send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>> };
      onResult?: (result: PickerResult | null) => void;
    };
    
    if (!session || !session.cdpSession) {
      throw new Error('Sesión no encontrada o no es interactiva');
    }

    try {
      // Get node at coordinates using CDP
      const nodeResult = await session.cdpSession.send('DOM.getNodeForLocation', {
        x: Math.round(x),
        y: Math.round(y),
        includeUserAgentShadowDOM: false,
        ignorePointerEventsNone: true,
      }) as { backendNodeId: number; nodeId?: number };

      if (!nodeResult.backendNodeId) {
        return null;
      }

      // Get document root to enable full DOM access
      await session.cdpSession.send('DOM.getDocument', { depth: -1 });

      // Describe the node to get its details
      const nodeDetails = await session.cdpSession.send('DOM.describeNode', {
        backendNodeId: nodeResult.backendNodeId,
        depth: 0,
      }) as { node: { nodeName: string; nodeId: number; attributes?: string[]; localName: string } };

      const node = nodeDetails.node;
      const tagName = node.localName || node.nodeName.toLowerCase();
      
      // Parse attributes
      const attributes: Record<string, string> = {};
      if (node.attributes) {
        for (let i = 0; i < node.attributes.length; i += 2) {
          attributes[node.attributes[i]] = node.attributes[i + 1];
        }
      }

      // Get bounding box
      let rect = { x: 0, y: 0, width: 0, height: 0 };
      try {
        const boxResult = await session.cdpSession.send('DOM.getBoxModel', {
          backendNodeId: nodeResult.backendNodeId,
        }) as { model?: { content: number[] } };
        if (boxResult.model) {
          const content = boxResult.model.content;
          rect = {
            x: content[0],
            y: content[1],
            width: content[2] - content[0],
            height: content[5] - content[1],
          };
        }
      } catch {
        // Box model may fail for some elements
      }

      // Get text content
      let textContent = '';
      try {
        const resolved = await session.cdpSession.send('DOM.resolveNode', {
          backendNodeId: nodeResult.backendNodeId,
        }) as { object?: { objectId: string } };
        
        if (resolved.object?.objectId) {
          const textResult = await session.cdpSession.send('Runtime.callFunctionOn', {
            objectId: resolved.object.objectId,
            functionDeclaration: 'function() { return this.textContent?.trim().slice(0, 50) || ""; }',
            returnByValue: true,
          }) as { result?: { value: string } };
          textContent = textResult.result?.value || '';
        }
      } catch {
        // Text extraction may fail
      }

      // Generate selectors
      const selectors = this.generateSelectors(tagName, attributes, textContent);

      const result: PickerResult = {
        selector: selectors.primary.selector,
        selectorType: selectors.primary.type as PickerResult['selectorType'],
        element: {
          tagName,
          id: attributes.id,
          className: attributes.class,
          text: textContent,
          rect,
        },
        alternatives: selectors.alternatives,
      };

      // Mark session as completed
      session.status = 'completed';
      session.selectedSelector = result.selector;
      
      // Stop screencast and notify result
      try {
        await session.cdpSession.send('Page.stopScreencast');
      } catch {
        // May already be stopped
      }
      
      if (session.onResult) {
        session.onResult(result);
      }

      // Close after short delay
      setTimeout(() => this.closeSession(sessionId), 500);

      return result;
    } catch (error) {
      console.error('Error selecting element:', error);
      return null;
    }
  }

  /**
   * Generate CSS selectors for an element
   */
  private generateSelectors(
    tagName: string, 
    attributes: Record<string, string>, 
    textContent: string
  ): { primary: { selector: string; type: string }; alternatives: Array<{ selector: string; type: string; confidence: number }> } {
    const alternatives: Array<{ selector: string; type: string; confidence: number }> = [];

    // Priority 1: data-testid
    if (attributes['data-testid']) {
      return {
        primary: { selector: attributes['data-testid'], type: 'testId' },
        alternatives: [],
      };
    }

    // Priority 2: id
    if (attributes.id && !attributes.id.match(/^[0-9]|[:\s]/)) {
      alternatives.push({ selector: `#${attributes.id}`, type: 'css', confidence: 95 });
    }

    // Priority 3: role + name
    if (attributes.role) {
      const name = attributes['aria-label'] || textContent;
      if (name) {
        alternatives.push({ selector: `${attributes.role}[name="${name.slice(0, 30)}"]`, type: 'role', confidence: 90 });
      }
    }

    // Priority 4: text selector (for buttons, links, labels)
    if (textContent && ['button', 'a', 'label', 'span'].includes(tagName)) {
      alternatives.push({ selector: textContent.slice(0, 40), type: 'text', confidence: 85 });
    }

    // Priority 5: CSS class selector
    if (attributes.class) {
      const classes = attributes.class.split(/\s+/).filter(c => c && !c.match(/^[0-9]|--/));
      if (classes.length > 0) {
        const selector = `${tagName}.${classes.slice(0, 2).join('.')}`;
        alternatives.push({ selector, type: 'css', confidence: 70 });
      }
    }

    // Priority 6: tag + attribute
    const usefulAttrs = ['name', 'type', 'placeholder', 'href', 'src'];
    for (const attr of usefulAttrs) {
      if (attributes[attr]) {
        const value = attributes[attr].slice(0, 50);
        alternatives.push({ selector: `${tagName}[${attr}="${value}"]`, type: 'css', confidence: 65 });
        break;
      }
    }

    // Fallback: just tag
    if (alternatives.length === 0) {
      alternatives.push({ selector: tagName, type: 'css', confidence: 30 });
    }

    return {
      primary: alternatives[0],
      alternatives: alternatives.slice(1),
    };
  }
}

export const pickerService = new PickerService();
