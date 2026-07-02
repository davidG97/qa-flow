import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';

const router = Router();

// GET /api/reports - Listar reportes
router.get('/reports', reportController.list);

// GET /api/reports/:id - Obtener reporte JSON
router.get('/reports/:id', reportController.getJson);

// GET /api/reports/:id/html - Obtener reporte HTML
router.get('/reports/:id/html', reportController.getHtml);

// GET /api/reports/:id/download - Descargar reporte HTML
router.get('/reports/:id/download', reportController.download);

// DELETE /api/reports/:id - Eliminar reporte
router.delete('/reports/:id', reportController.delete);

export default router;
