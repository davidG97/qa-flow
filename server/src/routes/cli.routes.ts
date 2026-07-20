import { Router, Request, Response } from 'express';
import { cliRunnerService, CLIRunnerOptions } from '../services/cli-runner.service.js';
import { TestFlow } from '../types/index.js';

const router = Router();

/**
 * POST /cli/run
 * Runs a flow using the Playwright Test Runner CLI
 * 
 * Body:
 * - flow: TestFlow (required)
 * - options: CLIRunnerOptions (optional)
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
 * Lists available generated tests
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
 * Cleans old generated tests
 * 
 * Query:
 * - olderThanHours: number of hours (default: 24)
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
 * Gets the HTML report path from the last execution
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
 * Opens the HTML report in the browser (only for local development)
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
