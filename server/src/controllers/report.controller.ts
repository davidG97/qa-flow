import { Request, Response } from 'express';
import { ReporterService } from '../services/reporter.service.js';

export const reportController = {
  /**
   * GET /api/reports - Obtener lista de reportes
   */
  list(req: Request, res: Response) {
    try {
      const reports = ReporterService.getAllReports();
      res.json({
        reports: reports.map(r => ({
          id: r.id,
          executionId: r.executionId,
          flowName: r.flowName,
          status: r.status,
          summary: r.summary,
          duration: r.duration,
          generatedAt: r.generatedAt,
        })),
      });
    } catch (error) {
      console.error('Error getting reports:', error);
      res.status(500).json({ error: 'Error getting reports' });
    }
  },

  /**
   * GET /api/reports/:id - Obtener reporte JSON por ID
   */
  getJson(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const report = ReporterService.getReport(id);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json(report);
    } catch (error) {
      console.error('Error getting report:', error);
      res.status(500).json({ error: 'Error getting report' });
    }
  },

  /**
   * GET /api/reports/:id/html - Obtener reporte HTML por ID
   */
  getHtml(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const report = ReporterService.getReport(id);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const html = ReporterService.generateHtmlReport(report);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error generating HTML report:', error);
      res.status(500).json({ error: 'Error generating HTML report' });
    }
  },

  /**
   * GET /api/reports/:id/download - Descargar reporte HTML
   */
  download(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const report = ReporterService.getReport(id);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const html = ReporterService.generateHtmlReport(report);
      const filename = `qa-flow-report-${report.executionId.substring(0, 8)}.html`;
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(html);
    } catch (error) {
      console.error('Error downloading report:', error);
      res.status(500).json({ error: 'Error downloading report' });
    }
  },

  /**
   * DELETE /api/reports/:id - Eliminar reporte
   */
  delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = ReporterService.deleteReport(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json({ message: 'Report deleted' });
    } catch (error) {
      console.error('Error deleting report:', error);
      res.status(500).json({ error: 'Error deleting report' });
    }
  },
};
