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
      console.error('Error listando reportes:', error);
      res.status(500).json({ error: 'Error obteniendo reportes' });
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
        return res.status(404).json({ error: 'Reporte no encontrado' });
      }

      res.json(report);
    } catch (error) {
      console.error('Error obteniendo reporte:', error);
      res.status(500).json({ error: 'Error obteniendo reporte' });
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
        return res.status(404).json({ error: 'Reporte no encontrado' });
      }

      const html = ReporterService.generateHtmlReport(report);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error generando HTML:', error);
      res.status(500).json({ error: 'Error generando reporte HTML' });
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
        return res.status(404).json({ error: 'Reporte no encontrado' });
      }

      const html = ReporterService.generateHtmlReport(report);
      const filename = `qa-flow-report-${report.executionId.substring(0, 8)}.html`;
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(html);
    } catch (error) {
      console.error('Error descargando reporte:', error);
      res.status(500).json({ error: 'Error descargando reporte' });
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
        return res.status(404).json({ error: 'Reporte no encontrado' });
      }

      res.json({ message: 'Reporte eliminado' });
    } catch (error) {
      console.error('Error eliminando reporte:', error);
      res.status(500).json({ error: 'Error eliminando reporte' });
    }
  },
};
