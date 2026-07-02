import prisma from './database.service.js';
import { ExecutionStatus, ExecutionResult } from '../types/index.js';

export interface TestRunDTO {
  id: string;
  projectId: string;
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration?: number;
  createdAt: Date;
  results?: TestResultDTO[];
}

export interface TestResultDTO {
  id: string;
  testRunId: string;
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  testName?: string;
  success: boolean;
  message?: string;
  error?: string;
  duration?: number;
  screenshot?: string;
  executedAt: Date;
}

export interface CreateTestRunInput {
  projectId: string;
}

/**
 * Servicio para gestionar ejecuciones de tests en la base de datos
 */
export class TestRunsService {

  /**
   * Crea una nueva ejecución de tests
   */
  async create(projectId: string): Promise<TestRunDTO> {
    const testRun = await prisma.testRun.create({
      data: {
        projectId,
        status: 'pending',
      },
    });

    return this.mapToDTO(testRun);
  }

  /**
   * Inicia una ejecución
   */
  async start(id: string): Promise<TestRunDTO | null> {
    const testRun = await prisma.testRun.update({
      where: { id },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    return this.mapToDTO(testRun);
  }

  /**
   * Completa una ejecución
   */
  async complete(id: string, status: ExecutionStatus): Promise<TestRunDTO | null> {
    // Contar resultados
    const results = await prisma.testResult.findMany({
      where: { testRunId: id },
    });

    const passed = results.filter((r: { success: boolean }) => r.success).length;
    const failed = results.filter((r: { success: boolean }) => !r.success).length;
    const startedRun = await prisma.testRun.findUnique({ where: { id } });
    
    const duration = startedRun?.startedAt 
      ? Date.now() - startedRun.startedAt.getTime()
      : undefined;

    const testRun = await prisma.testRun.update({
      where: { id },
      data: {
        status: status.status,
        completedAt: new Date(),
        error: status.error,
        totalTests: results.length,
        passedTests: passed,
        failedTests: failed,
        duration,
      },
    });

    return this.mapToDTO(testRun);
  }

  /**
   * Agrega un resultado de nodo
   */
  async addResult(testRunId: string, result: ExecutionResult, testName?: string): Promise<TestResultDTO> {
    const testResult = await prisma.testResult.create({
      data: {
        testRunId,
        nodeId: result.nodeId,
        nodeType: result.nodeType,
        nodeLabel: result.nodeType,
        testName,
        success: result.success,
        message: result.message,
        error: result.error,
        duration: result.duration,
        screenshot: result.screenshot,
      },
    });

    return {
      id: testResult.id,
      testRunId: testResult.testRunId,
      nodeId: testResult.nodeId,
      nodeType: testResult.nodeType,
      nodeLabel: testResult.nodeLabel ?? undefined,
      testName: testResult.testName ?? undefined,
      success: testResult.success,
      message: testResult.message ?? undefined,
      error: testResult.error ?? undefined,
      duration: testResult.duration ?? undefined,
      screenshot: testResult.screenshot ?? undefined,
      executedAt: testResult.executedAt,
    };
  }

  /**
   * Obtiene una ejecución por ID con sus resultados
   */
  async findById(id: string): Promise<TestRunDTO | null> {
    const testRun = await prisma.testRun.findUnique({
      where: { id },
      include: { results: true },
    });

    if (!testRun) return null;

    interface DBTestResult {
      id: string;
      testRunId: string;
      nodeId: string;
      nodeType: string;
      nodeLabel: string | null;
      testName: string | null;
      success: boolean;
      message: string | null;
      error: string | null;
      duration: number | null;
      screenshot: string | null;
      executedAt: Date;
    }

    return {
      ...this.mapToDTO(testRun),
      results: testRun.results.map((r: DBTestResult) => ({
        id: r.id,
        testRunId: r.testRunId,
        nodeId: r.nodeId,
        nodeType: r.nodeType,
        nodeLabel: r.nodeLabel ?? undefined,
        testName: r.testName ?? undefined,
        success: r.success,
        message: r.message ?? undefined,
        error: r.error ?? undefined,
        duration: r.duration ?? undefined,
        screenshot: r.screenshot ?? undefined,
        executedAt: r.executedAt,
      })),
    };
  }

  /**
   * Obtiene las últimas ejecuciones de un proyecto
   */
  async findByProject(projectId: string, limit = 10): Promise<TestRunDTO[]> {
    const testRuns = await prisma.testRun.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return testRuns.map(this.mapToDTO);
  }

  /**
   * Obtiene todas las ejecuciones recientes
   */
  async findRecent(limit = 20): Promise<TestRunDTO[]> {
    const testRuns = await prisma.testRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return testRuns.map(this.mapToDTO);
  }

  /**
   * Guarda el reporte HTML de una ejecución
   */
  async saveReport(testRunId: string, htmlContent: string, summary?: object): Promise<void> {
    await prisma.report.upsert({
      where: { testRunId },
      create: {
        testRunId,
        htmlContent,
        summary: summary ? JSON.stringify(summary) : null,
      },
      update: {
        htmlContent,
        summary: summary ? JSON.stringify(summary) : null,
      },
    });
  }

  /**
   * Obtiene el reporte de una ejecución
   */
  async getReport(testRunId: string): Promise<{ htmlContent: string; summary?: object } | null> {
    const report = await prisma.report.findUnique({
      where: { testRunId },
    });

    if (!report) return null;

    return {
      htmlContent: report.htmlContent,
      summary: report.summary ? JSON.parse(report.summary) : undefined,
    };
  }

  private mapToDTO(testRun: {
    id: string;
    projectId: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    error: string | null;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    duration: number | null;
    createdAt: Date;
  }): TestRunDTO {
    return {
      id: testRun.id,
      projectId: testRun.projectId,
      status: testRun.status,
      startedAt: testRun.startedAt ?? undefined,
      completedAt: testRun.completedAt ?? undefined,
      error: testRun.error ?? undefined,
      totalTests: testRun.totalTests,
      passedTests: testRun.passedTests,
      failedTests: testRun.failedTests,
      duration: testRun.duration ?? undefined,
      createdAt: testRun.createdAt,
    };
  }
}

export const testRunsService = new TestRunsService();
