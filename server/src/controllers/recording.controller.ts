import { Request, Response } from 'express';
import { 
  startRecording, 
  getRecordingStatus, 
  stopRecording, 
  parsePlaywrightCodeToNodes,
  listRecordingFiles,
  deleteRecording,
  cleanupOldRecordings,
  deleteAllRecordings
} from '../services/recorder.service.js';

export const recordingController = {
  /**
   * POST /api/record/start - Iniciar grabación con Playwright Codegen
   */
  async start(req: Request, res: Response) {
    try {
      const { url } = req.body as { url?: string };
      const result = await startRecording(url);
      res.json(result);
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      res.status(500).json({ 
        error: 'Error iniciando grabación',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  /**
   * GET /api/record/status/:sessionId - Obtener estado de grabación
   */
  getStatus(req: Request, res: Response) {
    const { sessionId } = req.params;
    const session = getRecordingStatus(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    res.json({
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      hasCode: !!session.code,
      error: session.error,
    });
  },

  /**
   * POST /api/record/stop/:sessionId - Detener grabación
   */
  stop(req: Request, res: Response) {
    const { sessionId } = req.params;
    const stopped = stopRecording(sessionId);
    
    if (!stopped) {
      return res.status(404).json({ error: 'Sesión no encontrada o ya terminada' });
    }
    
    res.json({ message: 'Grabación detenida' });
  },

  /**
   * GET /api/record/code/:sessionId - Obtener código grabado
   */
  getCode(req: Request, res: Response) {
    const { sessionId } = req.params;
    const session = getRecordingStatus(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    if (session.status === 'recording') {
      return res.status(400).json({ error: 'La grabación aún está en progreso' });
    }
    
    if (!session.code) {
      return res.status(400).json({ error: 'No hay código disponible' });
    }
    
    res.json({ code: session.code });
  },

  /**
   * GET /api/record/nodes/:sessionId - Convertir código grabado a nodos
   */
  getNodes(req: Request, res: Response) {
    const { sessionId } = req.params;
    const session = getRecordingStatus(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    if (!session.code) {
      return res.status(400).json({ error: 'No hay código disponible' });
    }
    
    const { nodes, edges } = parsePlaywrightCodeToNodes(session.code);
    res.json({ nodes, edges, code: session.code });
  },

  /**
   * POST /api/parse-code - Parsear código Playwright (desde texto)
   */
  parseCode(req: Request, res: Response) {
    const { code } = req.body as { code: string };
    
    if (!code) {
      return res.status(400).json({ error: 'Código requerido' });
    }
    
    try {
      const { nodes, edges } = parsePlaywrightCodeToNodes(code);
      res.json({ nodes, edges });
    } catch (error) {
      res.status(400).json({ 
        error: 'Error parseando código',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  /**
   * GET /api/recordings - Listar todas las grabaciones
   */
  listRecordings(_req: Request, res: Response) {
    try {
      const result = listRecordingFiles();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: 'Error listando grabaciones',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  /**
   * DELETE /api/recordings/:sessionId - Eliminar una grabación específica
   */
  deleteOne(req: Request, res: Response) {
    const { sessionId } = req.params;
    
    const deleted = deleteRecording(sessionId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Grabación no encontrada' });
    }
    
    res.json({ message: 'Grabación eliminada', sessionId });
  },

  /**
   * DELETE /api/recordings - Eliminar todas las grabaciones
   */
  deleteAll(_req: Request, res: Response) {
    try {
      const result = deleteAllRecordings();
      res.json({ 
        message: 'Todas las grabaciones eliminadas',
        ...result 
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Error eliminando grabaciones',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  /**
   * POST /api/recordings/cleanup - Limpiar grabaciones antiguas
   */
  cleanup(req: Request, res: Response) {
    const { maxAgeHours = 24 } = req.body as { maxAgeHours?: number };
    
    try {
      const result = cleanupOldRecordings(maxAgeHours);
      res.json({ 
        message: `Limpieza completada (archivos mayores a ${maxAgeHours} horas)`,
        ...result 
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Error en limpieza',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },
};
