import { Router, Request, Response } from 'express';
import { testRunsService } from '../services/test-runs.service.js';

const router = Router();

/**
 * GET /api/test-runs
 * Gets recent test runs
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const testRuns = await testRunsService.findRecent(limit);
    res.json(testRuns);
  } catch (error) {
    console.error('Error getting recent test runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/test-runs/:id
 * Gets a test run with its results
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const testRun = await testRunsService.findById(req.params.id);
    if (!testRun) {
      res.status(404).json({ error: 'Test run not found' });
      return;
    }
    res.json(testRun);
  } catch (error) {
    console.error('Error getting test run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/test-runs/project/:projectId
 * Gets executions for a project
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const limit = Number.parseInt(req.query.limit as string) || 10;
    const testRuns = await testRunsService.findByProject(req.params.projectId, limit);
    res.json(testRuns);
  } catch (error) {
    console.error('Error getting project executions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/test-runs/:id/report
 * Gets the HTML report of a test run
 */
router.get('/:id/report', async (req: Request, res: Response) => {
  try {
    const report = await testRunsService.getReport(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // If HTML is requested, return the content directly
    if (req.accepts('html')) {
      res.type('html').send(report.htmlContent);
      return;
    }

    res.json(report);
  } catch (error) {
    console.error('Error getting report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
