import { ExecutionStatus, ExecutionResult, TestFlow } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface TestReport {
  id: string;
  executionId: string;
  flowName: string;
  generatedAt: Date;
  duration: number;
  status: 'passed' | 'failed' | 'flaky';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  tests: TestResult[];
  config?: {
    executionMode: string;
    workers: number;
    retries: number;
  };
}

export interface TestResult {
  name: string;
  nodeId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  steps: StepResult[];
}

export interface StepResult {
  title: string;
  nodeId: string;
  nodeType: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
  screenshot?: string;
}

// Almacén de reportes en memoria
const reports = new Map<string, TestReport>();
const reportHtmlCache = new Map<string, string>();

// Directorio para reportes persistentes
const REPORTS_DIR = path.join(process.cwd(), 'reports');

export class ReporterService {
  /**
   * Generar reporte desde una ejecución completada
   */
  static generateReport(
    executionId: string,
    status: ExecutionStatus,
    flow: TestFlow
  ): TestReport {
    const startTime = status.startedAt ? new Date(status.startedAt).getTime() : Date.now();
    const endTime = status.completedAt ? new Date(status.completedAt).getTime() : Date.now();
    const duration = endTime - startTime;

    // Agrupar resultados por test (nodos start)
    const testGroups = this.groupResultsByTest(status.results, flow);
    
    const tests: TestResult[] = testGroups.map(group => ({
      name: group.testName,
      nodeId: group.startNodeId,
      status: group.results.some(r => !r.success) ? 'failed' : 'passed',
      duration: group.results.reduce((sum, r) => sum + r.duration, 0),
      error: group.results.find(r => !r.success)?.error,
      steps: group.results.map(r => ({
        title: r.message,
        nodeId: r.nodeId,
        nodeType: r.nodeType,
        status: r.success ? 'passed' : 'failed',
        duration: r.duration,
        error: r.error,
        screenshot: r.screenshot,
      })),
    }));

    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;

    const report: TestReport = {
      id: uuidv4(),
      executionId,
      flowName: flow.name || 'Test Flow',
      generatedAt: new Date(),
      duration,
      status: failed > 0 ? 'failed' : 'passed',
      summary: {
        total: tests.length,
        passed,
        failed,
        skipped: 0,
      },
      tests,
      config: flow.config ? {
        executionMode: flow.config.executionMode,
        workers: flow.config.workers,
        retries: flow.config.retries,
      } : undefined,
    };

    // Almacenar reporte
    reports.set(report.id, report);
    reports.set(executionId, report); // También por executionId para fácil acceso

    return report;
  }

  /**
   * Agrupar resultados por test
   */
  private static groupResultsByTest(
    results: ExecutionResult[],
    flow: TestFlow
  ): Array<{ testName: string; startNodeId: string; results: ExecutionResult[] }> {
    const startNodes = flow.nodes.filter(n => n.data.nodeType === 'start');
    
    if (startNodes.length === 0) {
      // Si no hay nodos start, tratar todo como un solo test
      return [{
        testName: flow.name || 'Test',
        startNodeId: 'flow',
        results,
      }];
    }

    // Por simplicidad, si hay múltiples tests, agrupar por el patrón [testName] en el mensaje
    const groups = new Map<string, ExecutionResult[]>();
    
    for (const result of results) {
      // Extraer nombre del test del mensaje - puede ser [testName] o [testName][hookName]
      const match = result.message.match(/^\[([^\]]+)\]/);
      // Solo usar "Default Test" si realmente no hay ningún prefijo de test
      const testName = match ? match[1] : (startNodes.length === 1 
        ? ((startNodes[0].data.config.testName as string) || startNodes[0].data.label || 'Test')
        : 'Test');
      
      if (!groups.has(testName)) {
        groups.set(testName, []);
      }
      groups.get(testName)!.push(result);
    }

    return Array.from(groups.entries()).map(([testName, results]) => {
      const startNode = startNodes.find(n => 
        (n.data.config.testName as string) === testName || n.data.label === testName
      );
      return {
        testName,
        startNodeId: startNode?.id || 'unknown',
        results,
      };
    });
  }

  /**
   * Obtener reporte por ID o executionId
   */
  static getReport(id: string): TestReport | undefined {
    return reports.get(id);
  }

  /**
   * Generar HTML del reporte (estilo Playwright)
   */
  static generateHtmlReport(report: TestReport): string {
    const statusColor = report.status === 'passed' ? '#22c55e' : '#ef4444';
    const statusIcon = report.status === 'passed' ? '✓' : '✗';

    const testsHtml = report.tests.map(test => {
      const testStatusColor = test.status === 'passed' ? '#22c55e' : '#ef4444';
      const testIcon = test.status === 'passed' ? '✓' : '✗';
      
      const stepsHtml = test.steps.map(step => {
        const stepColor = step.status === 'passed' ? '#22c55e' : '#ef4444';
        const stepIcon = step.status === 'passed' ? '✓' : '✗';
        
        return `
          <div class="step ${step.status}">
            <span class="step-icon" style="color: ${stepColor}">${stepIcon}</span>
            <span class="step-title">${this.escapeHtml(step.title)}</span>
            <span class="step-duration">${step.duration}ms</span>
            ${step.error ? `<div class="step-error">${this.escapeHtml(step.error)}</div>` : ''}
          </div>
        `;
      }).join('');

      return `
        <div class="test ${test.status}">
          <div class="test-header" onclick="toggleTest(this)">
            <span class="test-icon" style="color: ${testStatusColor}">${testIcon}</span>
            <span class="test-name">${this.escapeHtml(test.name)}</span>
            <span class="test-duration">${this.formatDuration(test.duration)}</span>
            <span class="test-expand">▼</span>
          </div>
          <div class="test-steps">
            ${stepsHtml}
          </div>
          ${test.error ? `<div class="test-error">${this.escapeHtml(test.error)}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Flow Report - ${this.escapeHtml(report.flowName)}</title>
  <style>
    :root {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-tertiary: #1a1a24;
      --text-primary: #ffffff;
      --text-secondary: #a0a0a0;
      --border-color: #2a2a3a;
      --accent: #6366f1;
      --success: #22c55e;
      --error: #ef4444;
      --warning: #f59e0b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: var(--accent);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.25rem;
    }

    .logo-text {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.875rem;
      background-color: ${statusColor}20;
      color: ${statusColor};
      border: 1px solid ${statusColor}40;
    }

    .status-icon {
      font-size: 1rem;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .meta {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .summary-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }

    .summary-value {
      font-size: 2rem;
      font-weight: 700;
    }

    .summary-label {
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .summary-card.passed .summary-value { color: var(--success); }
    .summary-card.failed .summary-value { color: var(--error); }
    .summary-card.duration .summary-value { color: var(--accent); }

    .tests-section {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
    }

    .tests-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
    }

    .test {
      border-bottom: 1px solid var(--border-color);
    }

    .test:last-child {
      border-bottom: none;
    }

    .test-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .test-header:hover {
      background-color: var(--bg-tertiary);
    }

    .test-icon {
      font-size: 1rem;
      font-weight: bold;
    }

    .test-name {
      flex: 1;
      font-weight: 500;
    }

    .test-duration {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .test-expand {
      color: var(--text-secondary);
      transition: transform 0.2s;
    }

    .test.expanded .test-expand {
      transform: rotate(180deg);
    }

    .test-steps {
      display: none;
      padding: 0 1.5rem 1rem 2.5rem;
    }

    .test.expanded .test-steps {
      display: block;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem 0;
      font-size: 0.875rem;
      border-left: 2px solid var(--border-color);
      padding-left: 1rem;
      margin-left: 0.5rem;
    }

    .step.passed {
      border-left-color: var(--success);
    }

    .step.failed {
      border-left-color: var(--error);
    }

    .step-icon {
      flex-shrink: 0;
    }

    .step-title {
      flex: 1;
      color: var(--text-secondary);
    }

    .step-duration {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    .step-error, .test-error {
      background: var(--error)10;
      border: 1px solid var(--error)30;
      border-radius: 4px;
      padding: 0.75rem;
      margin-top: 0.5rem;
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--error);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .config-section {
      margin-top: 2rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .config-title {
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .config-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .config-label {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    .config-value {
      font-weight: 500;
    }

    footer {
      text-align: center;
      margin-top: 2rem;
      padding: 1rem;
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .header-top {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div class="logo">
          <div class="logo-icon">QF</div>
          <span class="logo-text">QA Flow Report</span>
        </div>
        <div class="status-badge">
          <span class="status-icon">${statusIcon}</span>
          <span>${report.status.toUpperCase()}</span>
        </div>
      </div>
      
      <h1>${this.escapeHtml(report.flowName)}</h1>
      <p class="meta">
        Generated: ${report.generatedAt.toLocaleString()} • 
        Duration: ${this.formatDuration(report.duration)} •
        Execution ID: ${report.executionId.substring(0, 8)}...
      </p>
      
      <div class="summary">
        <div class="summary-card">
          <div class="summary-value">${report.summary.total}</div>
          <div class="summary-label">Total Tests</div>
        </div>
        <div class="summary-card passed">
          <div class="summary-value">${report.summary.passed}</div>
          <div class="summary-label">Passed</div>
        </div>
        <div class="summary-card failed">
          <div class="summary-value">${report.summary.failed}</div>
          <div class="summary-label">Failed</div>
        </div>
        <div class="summary-card duration">
          <div class="summary-value">${this.formatDuration(report.duration)}</div>
          <div class="summary-label">Duration</div>
        </div>
      </div>
    </header>

    <section class="tests-section">
      <div class="tests-header">Test Results</div>
      ${testsHtml}
    </section>

    ${report.config ? `
    <section class="config-section">
      <div class="config-title">Execution Configuration</div>
      <div class="config-grid">
        <div class="config-item">
          <span class="config-label">Mode</span>
          <span class="config-value">${report.config.executionMode}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Workers</span>
          <span class="config-value">${report.config.workers}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Retries</span>
          <span class="config-value">${report.config.retries}</span>
        </div>
      </div>
    </section>
    ` : ''}

    <footer>
      QA Flow Test Automation • Report generated with ❤️
    </footer>
  </div>

  <script>
    function toggleTest(header) {
      const test = header.parentElement;
      test.classList.toggle('expanded');
    }

    // Expandir tests fallidos por defecto
    document.querySelectorAll('.test.failed').forEach(test => {
      test.classList.add('expanded');
    });
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Formatear duración en formato legible
   */
  private static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Escapar HTML para prevenir XSS
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Guardar reporte HTML en disco
   */
  static async saveHtmlReport(report: TestReport): Promise<string> {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    
    const filename = `report-${report.executionId.substring(0, 8)}-${Date.now()}.html`;
    const filepath = path.join(REPORTS_DIR, filename);
    
    const html = this.generateHtmlReport(report);
    await fs.writeFile(filepath, html, 'utf-8');
    
    console.log(`📊 Reporte guardado: ${filepath}`);
    return filepath;
  }

  /**
   * Generar reporte JSON
   */
  static generateJsonReport(report: TestReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Obtener todos los reportes
   */
  static getAllReports(): TestReport[] {
    const uniqueReports = new Map<string, TestReport>();
    reports.forEach(report => {
      uniqueReports.set(report.id, report);
    });
    return Array.from(uniqueReports.values())
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  /**
   * Eliminar reporte
   */
  static deleteReport(id: string): boolean {
    const report = reports.get(id);
    if (report) {
      reports.delete(id);
      reports.delete(report.executionId);
      return true;
    }
    return false;
  }
}
