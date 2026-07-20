// ponytail: Frontend-based picker fallback for Docker (no Playwright GUI)
// Opens target URL in popup, injects picker script, communicates via postMessage

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

const PICKER_SCRIPT = `
(function() {
  if (window.__qaFlowPickerActive) return;
  window.__qaFlowPickerActive = true;

  let currentHighlight = null;
  let overlay = null;
  let tooltip = null;

  overlay = document.createElement('div');
  overlay.id = '__qaflow-picker-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;pointer-events:none;';
  document.body.appendChild(overlay);

  currentHighlight = document.createElement('div');
  currentHighlight.id = '__qaflow-picker-highlight';
  currentHighlight.style.cssText = 'position:fixed;border:2px solid #6366f1;background:rgba(99,102,241,0.1);pointer-events:none;z-index:2147483647;transition:all 0.1s ease;display:none;';
  document.body.appendChild(currentHighlight);

  tooltip = document.createElement('div');
  tooltip.id = '__qaflow-picker-tooltip';
  tooltip.style.cssText = 'position:fixed;background:#1e1e2e;color:#fff;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:12px;z-index:2147483647;pointer-events:none;max-width:400px;word-break:break-all;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:none;';
  document.body.appendChild(tooltip);

  const banner = document.createElement('div');
  banner.id = '__qaflow-picker-banner';
  banner.innerHTML = '🎯 QA Flow - Click to select • ESC cancel';
  banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;padding:10px 20px;border-radius:24px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;font-weight:500;box-shadow:0 4px 12px rgba(99,102,241,0.4);pointer-events:none;';
  document.body.appendChild(banner);

  function generateSelectors(element) {
    const selectors = [];
    if (element.id) selectors.push({ selector: '#' + element.id, type: 'css', confidence: 95 });
    const testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');
    if (testId) selectors.push({ selector: testId, type: 'testId', confidence: 100 });
    const role = element.getAttribute('role') || getImplicitRole(element);
    const ariaLabel = element.getAttribute('aria-label');
    if (role && ariaLabel) selectors.push({ selector: role + '[name="' + ariaLabel + '"]', type: 'role', confidence: 90 });
    else if (role) selectors.push({ selector: role, type: 'role', confidence: 70 });
    const text = element.textContent?.trim();
    if (text && text.length < 50 && ['A', 'BUTTON', 'LABEL', 'SPAN'].includes(element.tagName)) {
      selectors.push({ selector: text, type: 'text', confidence: 85 });
    }
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) selectors.push({ selector: '[placeholder="' + placeholder + '"]', type: 'css', confidence: 80 });
    const name = element.getAttribute('name');
    if (name) selectors.push({ selector: '[name="' + name + '"]', type: 'css', confidence: 75 });
    const classes = Array.from(element.classList).filter(c => !c.match(/^(hover|active|focus|disabled|selected|checked)/) && c.length < 30);
    if (classes.length > 0 && classes.length <= 2) selectors.push({ selector: '.' + classes.join('.'), type: 'css', confidence: 60 });
    selectors.push({ selector: getXPath(element), type: 'xpath', confidence: 40 });
    return selectors.sort((a, b) => b.confidence - a.confidence);
  }
  
  function getImplicitRole(element) {
    const tagRoles = { 'BUTTON': 'button', 'A': 'link', 'INPUT': element.type === 'checkbox' ? 'checkbox' : element.type === 'radio' ? 'radio' : element.type === 'submit' ? 'button' : null, 'SELECT': 'combobox', 'TEXTAREA': 'textbox', 'IMG': 'img', 'NAV': 'navigation', 'MAIN': 'main', 'HEADER': 'banner', 'FOOTER': 'contentinfo', 'ARTICLE': 'article', 'DIALOG': 'dialog', 'FORM': 'form', 'TABLE': 'table', 'UL': 'list', 'OL': 'list', 'LI': 'listitem' };
    return tagRoles[element.tagName] || null;
  }
  
  function getXPath(element) {
    if (element.id) return '//*[@id="' + element.id + '"]';
    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) { if (sibling.tagName === current.tagName) index++; sibling = sibling.previousElementSibling; }
      const tagName = current.tagName.toLowerCase();
      parts.unshift(index > 1 ? tagName + '[' + index + ']' : tagName);
      if (current.parentElement === document.body) { parts.unshift('body'); break; }
      current = current.parentElement;
    }
    return '//' + parts.join('/');
  }

  function handleMouseMove(e) {
    const target = e.target;
    if (target.id?.startsWith('__qaflow-picker')) return;
    const rect = target.getBoundingClientRect();
    currentHighlight.style.display = 'block';
    currentHighlight.style.top = rect.top + 'px';
    currentHighlight.style.left = rect.left + 'px';
    currentHighlight.style.width = rect.width + 'px';
    currentHighlight.style.height = rect.height + 'px';
    const selectors = generateSelectors(target);
    const bestSelector = selectors[0];
    tooltip.style.display = 'block';
    tooltip.innerHTML = '<div style="color:#a5b4fc;margin-bottom:4px;">' + target.tagName.toLowerCase() + '</div><div style="color:#22c55e;">' + bestSelector.type + ': ' + bestSelector.selector + '</div>';
    let tooltipTop = rect.bottom + 8;
    let tooltipLeft = rect.left;
    if (tooltipTop + 60 > window.innerHeight) tooltipTop = rect.top - 60;
    if (tooltipLeft + 300 > window.innerWidth) tooltipLeft = window.innerWidth - 310;
    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = tooltipLeft + 'px';
  }

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const target = e.target;
    if (target.id?.startsWith('__qaflow-picker')) return;
    const rect = target.getBoundingClientRect();
    const selectors = generateSelectors(target);
    const result = {
      selector: selectors[0].selector,
      selectorType: selectors[0].type,
      element: { tagName: target.tagName.toLowerCase(), id: target.id || undefined, className: target.className || undefined, text: target.textContent?.trim().substring(0, 100) || undefined, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } },
      alternatives: selectors.slice(0, 5)
    };
    window.opener.postMessage({ type: 'qaflow-picker-result', result }, '*');
    cleanup();
    window.close();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      window.opener.postMessage({ type: 'qaflow-picker-cancelled' }, '*');
      cleanup();
      window.close();
    }
  }

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

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
})();
`;

class PickerService {
  private popup: Window | null = null;
  private pendingResolve: ((result: PickerResult | null) => void) | null = null;
  private messageHandler: ((e: MessageEvent) => void) | null = null;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  async startPicker(targetUrl: string, onProgress?: (message: string) => void): Promise<PickerResult | null> {
    this.cleanup();
    onProgress?.('Abriendo página...');

    return new Promise((resolve) => {
      this.pendingResolve = resolve;

      this.messageHandler = (e: MessageEvent) => {
        if (e.data?.type === 'qaflow-picker-result') {
          this.cleanup();
          resolve(e.data.result);
        } else if (e.data?.type === 'qaflow-picker-cancelled') {
          this.cleanup();
          resolve(null);
        }
      };
      window.addEventListener('message', this.messageHandler);

      const width = Math.min(1280, window.screen.width - 100);
      const height = Math.min(800, window.screen.height - 100);
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      this.popup = window.open(targetUrl, 'qaflow-picker', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no`);

      if (!this.popup) {
        onProgress?.('Error: Popup bloqueado');
        this.cleanup();
        resolve(null);
        return;
      }

      // Check for popup close continuously
      this.checkInterval = setInterval(() => {
        if (this.popup?.closed) {
          this.cleanup();
          resolve(null);
        }
      }, 500);

      onProgress?.('Inyectando selector...');

      const checkLoaded = setInterval(() => {
        try {
          if (this.popup?.closed) {
            clearInterval(checkLoaded);
            return;
          }
          if (this.popup?.document?.readyState === 'complete') {
            clearInterval(checkLoaded);
            this.injectScript();
            onProgress?.('Selecciona un elemento');
          }
        } catch {
          clearInterval(checkLoaded);
          onProgress?.('Página cargada');
          setTimeout(() => {
            this.injectScriptCrossOrigin();
            onProgress?.('Selecciona un elemento');
          }, 1000);
        }
      }, 100);

      setTimeout(() => {
        if (this.popup && !this.popup.closed) {
          onProgress?.('Timeout');
          this.popup.close();
          this.cleanup();
          resolve(null);
        }
      }, 60000);
    });
  }

  private injectScript() {
    try {
      if (this.popup?.document) {
        const script = this.popup.document.createElement('script');
        script.textContent = PICKER_SCRIPT;
        this.popup.document.body.appendChild(script);
      }
    } catch {
      this.injectScriptCrossOrigin();
    }
  }

  private injectScriptCrossOrigin() {
    if (this.popup) {
      try {
        (this.popup as Window & { eval?: (code: string) => void }).eval?.(PICKER_SCRIPT);
      } catch {
        this.popup.close();
        this.cleanup();
        this.pendingResolve?.(null);
      }
    }
  }

  cancel() {
    if (this.popup && !this.popup.closed) this.popup.close();
    this.cleanup();
  }

  private cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.popup = null;
    this.pendingResolve = null;
  }
}

export const pickerService = new PickerService();
