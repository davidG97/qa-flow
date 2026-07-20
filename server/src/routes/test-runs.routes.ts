import { Router, Request, Response } from 'express';
import { testRunsService } from '../services/test-runs.service.js';

const router = Router();

/**
 * GET /api/test-runs
 * Obtiene las ejecuciones recientes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const testRuns = await testRunsService.findRecent(limit);
    res.json(testRuns);
  } catch (error) {
    console.error('Error obteniendo ejecuciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/test-runs/:id
 * Obtiene una ejecución con sus resultados
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const testRun = await testRunsService.findById(req.params.id);
    if (!testRun) {
      res.status(404).json({ error: 'Execution not found' });
      return;
    }
    res.json(testRun);
  } catch (error) {
    console.error('Error getting execution:', error);
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
    console.error('Error obteniendo ejecuciones del proyecto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/test-runs/:id/report
 * Obtiene el reporte HTML de una ejecución
 */
router.get('/:id/report', async (req: Request, res: Response) => {
  try {
    const report = await testRunsService.getReport(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Reporte no encontrado' });
      return;
    }

    // Si piden HTML, devolver el contenido directamente
    if (req.accepts('html')) {
      res.type('html').send(report.htmlContent);
      return;
    }

    res.json(report);
  } catch (error) {
    console.error('Error obteniendo reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
