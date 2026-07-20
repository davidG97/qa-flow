import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TestFlow, ProjectConfig } from '../types/index.js';
import { CodeGeneratorService } from './code-generator.service.js';

export interface CLIRunnerOptions {
  /** Browser to use: chromium, firefox, webkit, mobile-chrome, mobile-safari */
  browser?: string;
  /** Run in headed mode (visible) */
  headed?: boolean;
  /** Number of parallel workers */
  workers?: number;
  /** Number of retries */
  retries?: number;
  /** Timeout por test en ms */
  timeout?: number;
  /** Generar trace */
  trace?: boolean;
  /** Actualizar snapshots */
  updateSnapshots?: boolean;
  /** Tags a filtrar (ej: '@smoke') */
  grep?: string;
  /** Tags a excluir */
  grepInvert?: string;
}

export interface CLIRunResult {
  success: boolean;
  exitCode: number;
  duration: number;
  stdout: string;
  stderr: string;
  jsonReport?: PlaywrightJSONReport;
  htmlReportPath?: string;
  specFilePath: string;
}

export interface PlaywrightJSONReport {
  config: Record<string, unknown>;
  suites: PlaywrightSuite[];
  errors: string[];
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
  };
}

export interface PlaywrightSuite {
  title: string;
  file: string;
  specs: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

export interface PlaywrightSpec {
  title: string;
  ok: boolean;
  tags: string[];
  tests: PlaywrightTest[];
}

export interface PlaywrightTest {
  timeout: number;
  annotations: Array<{ type: string; description?: string }>;
  expectedStatus: string;
  projectId: string;
  projectName: string;
  results: PlaywrightTestResult[];
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
}

export interface PlaywrightTestResult {
  workerIndex: number;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  stdout: string[];
  stderr: string[];
  attachments: Array<{
    name: string;
    contentType: string;
    path?: string;
    body?: string;
  }>;
  retry: number;
  startTime: string;
}

/**
 * Service to run Playwright tests using the CLI
 * Useful for CI/CD execution with native reporters
 */
export class CLIRunnerService {
  private readonly codeGenerator: CodeGeneratorService;
  private readonly testsDir: string;
  private readonly resultsDir: string;

  constructor() {
    this.codeGenerator = new CodeGeneratorService();
    this.testsDir = path.join(process.cwd(), 'tests-generated');
    this.resultsDir = path.join(process.cwd(), 'test-results');
  }

  /**
   * Runs a flow using the Playwright Test Runner CLI
   */
  async runFlow(flow: TestFlow, options: CLIRunnerOptions = {}): Promise<CLIRunResult> {
    const startTime = Date.now();
    const runId = uuidv4();
    
    // Create directories if they don't exist
    await this.ensureDirectories();
    
    // Generate test code
    const testCode = this.codeGenerator.generate(flow);
    
    // Write .spec.ts file
    const specFileName = `${this.sanitizeFileName(flow.name || 'test')}-${runId}.spec.ts`;
    const specFilePath = path.join(this.testsDir, specFileName);
    await fs.writeFile(specFilePath, testCode, 'utf-8');
    
    try {
      // Build CLI arguments
      const args = this.buildArgs(specFilePath, options, flow.config);
      
      // Execute playwright test
      const result = await this.executePlaywright(args);
      
      // Read JSON report if it exists
      const jsonReportPath = path.join(this.resultsDir, 'results.json');
      let jsonReport: PlaywrightJSONReport | undefined;
      
      try {
        const jsonContent = await fs.readFile(jsonReportPath, 'utf-8');
        jsonReport = JSON.parse(jsonContent);
      } catch {
        // Report may not exist if test failed early
      }
      
      const htmlReportPath = path.join(this.resultsDir, 'html-report', 'index.html');
      const htmlExists = await fs.access(htmlReportPath).then(() => true).catch(() => false);
      
      return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        duration: Date.now() - startTime,
        stdout: result.stdout,
        stderr: result.stderr,
        jsonReport,
        htmlReportPath: htmlExists ? htmlReportPath : undefined,
        specFilePath,
      };
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        duration: Date.now() - startTime,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        specFilePath,
      };
    }
  }

  /**
   * Lists available generated tests
   */
  async listGeneratedTests(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.testsDir);
      return files.filter(f => f.endsWith('.spec.ts'));
    } catch {
      return [];
    }
  }

  /**
   * Cleans old generated tests
   */
  async cleanGeneratedTests(olderThanHours = 24): Promise<number> {
    try {
      const files = await fs.readdir(this.testsDir);
      const now = Date.now();
      const maxAge = olderThanHours * 60 * 60 * 1000;
      let cleaned = 0;
      
      for (const file of files) {
        const filePath = path.join(this.testsDir, file);
        const stat = await fs.stat(filePath);
        
        if (now - stat.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }
      
      return cleaned;
    } catch {
      return 0;
    }
  }

  /**
   * Gets the HTML report from the last execution
   */
  async getHtmlReportPath(): Promise<string | null> {
    const htmlReportPath = path.join(this.resultsDir, 'html-report', 'index.html');
    const exists = await fs.access(htmlReportPath).then(() => true).catch(() => false);
    return exists ? htmlReportPath : null;
  }

  /**
   * Opens the HTML report in the default browser
   */
  async showReport(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['playwright', 'show-report', path.join(this.resultsDir, 'html-report')], {
        stdio: 'inherit',
        shell: true,
      });
      
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`show-report exited with code ${code}`));
      });
    });
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.testsDir, { recursive: true });
    await fs.mkdir(this.resultsDir, { recursive: true });
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  private buildArgs(specFile: string, options: CLIRunnerOptions, flowConfig?: ProjectConfig): string[] {
    const args = ['playwright', 'test', specFile];
    
    // Browser/Project
    if (options.browser) {
      args.push('--project', options.browser);
    }
    
    // Headed mode
    if (options.headed) {
      args.push('--headed');
    }
    
    // Workers
    const workers = options.workers ?? flowConfig?.workers;
    if (workers && workers > 0) {
      args.push('--workers', workers.toString());
    }
    
    // Retries
    const retries = options.retries ?? flowConfig?.retries;
    if (retries && retries > 0) {
      args.push('--retries', retries.toString());
    }
    
    // Timeout
    const timeout = options.timeout ?? flowConfig?.timeout;
    if (timeout) {
      args.push('--timeout', timeout.toString());
    }
    
    // Trace
    if (options.trace) {
      args.push('--trace', 'on');
    }
    
    // Update snapshots
    if (options.updateSnapshots) {
      args.push('--update-snapshots');
    }
    
    // Filter by tags
    if (options.grep) {
      args.push('--grep', options.grep);
    }
    
    if (options.grepInvert) {
      args.push('--grep-invert', options.grepInvert);
    }
    
    // JSON reporter always active for parsing
    args.push('--reporter', 'json,list');
    
    return args;
  }

  private executePlaywright(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      
      const child = spawn('npx', args, {
        cwd: process.cwd(),
        shell: true,
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(this.resultsDir, 'results.json'),
        },
      });
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          exitCode: code ?? 1,
          stdout,
          stderr,
        });
      });
      
      child.on('error', (err) => {
        resolve({
          exitCode: 1,
          stdout,
          stderr: err.message,
        });
      });
    });
  }
}

// Singleton for use in routes
export const cliRunnerService = new CLIRunnerService();
