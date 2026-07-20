import { Router, Request, Response } from 'express';
import { cliRunnerService, CLIRunnerOptions } from '../services/cli-runner.service.js';
import { TestFlow } from '../types/index.js';

const router = Router();

/**
 * POST /cli/run
 * Ejecuta un flujo usando el Playwright Test Runner CLI
 * 
 * Body:
 * - flow: TestFlow (requerido)
 * - options: CLIRunnerOptions (opcional)
 */
router.post('/run', async (req: Request, res: Response): Promise<void> => {
  try {
    const { flow, options } = req.body as { flow: TestFlow; options?: CLIRunnerOptions };
    
    if (!flow?.nodes || !flow?.edges) {
      res.status(400).json({
        success: false,
        error: 'A valid flow with nodes and edges is required',
      });
      return;
    }
    
    const result = await cliRunnerService.runFlow(flow, options || {});
    
    res.json({
      success: result.success,
      data: {
        exitCode: result.exitCode,
        duration: result.duration,
        specFilePath: result.specFilePath,
        htmlReportPath: result.htmlReportPath,
        stats: result.jsonReport?.stats,
        suites: result.jsonReport?.suites,
        errors: result.jsonReport?.errors,
      },
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error running test with CLI',
    });
  }
});

/**
 * GET /cli/tests
 * Lista los tests generados disponibles
 */
router.get('/tests', async (_req: Request, res: Response): Promise<void> => {
  try {
    const tests = await cliRunnerService.listGeneratedTests();
    
    res.json({
      success: true,
      data: tests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error listing generated tests',
    });
  }
});

/**
 * DELETE /cli/tests
 * Limpia tests generados antiguos
 * 
 * Query:
 * - olderThanHours: número de horas (default: 24)
 */
router.delete('/tests', async (req: Request, res: Response): Promise<void> => {
  try {
    const olderThanHours = Number.parseInt(req.query.olderThanHours as string) || 24;
    const cleaned = await cliRunnerService.cleanGeneratedTests(olderThanHours);
    
    res.json({
      success: true,
      data: {
        cleanedFiles: cleaned,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error cleaning generated tests',
    });
  }
});

/**
 * GET /cli/report
 * Obtiene la ruta del reporte HTML de la última ejecución
 */
router.get('/report', async (_req: Request, res: Response): Promise<void> => {
  try {
    const reportPath = await cliRunnerService.getHtmlReportPath();
    
    if (reportPath) {
      res.json({
        success: true,
        data: {
          path: reportPath,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No HTML report available',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error getting report path',
    });
  }
});

/**
 * POST /cli/show-report
 * Abre el reporte HTML en el navegador (solo para desarrollo local)
 */
router.post('/show-report', async (_req: Request, res: Response): Promise<void> => {
  try {
    await cliRunnerService.showReport();
    
    res.json({
      success: true,
      message: 'Report opened in the browser',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error opening report',
    });
  }
});

export default router;
