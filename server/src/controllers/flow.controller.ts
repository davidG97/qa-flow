import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TestFlow } from '../types/index.js';
import { codeGeneratorService } from '../services/code-generator.service.js';

export const flowController = {
  /**
   * GET /api/health - Health check
   */
  health(_req: Request, res: Response) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  },

  /**
   * POST /api/flows - Guardar flujo
   */
  save(req: Request, res: Response) {
    const flow = req.body as TestFlow;
    
    if (!flow.id) {
      flow.id = uuidv4();
    }
    
    // Por ahora solo devolvemos el flujo con ID
    // En el futuro podemos persistir en SQLite, PostgreSQL, etc.
    res.json({ 
      message: 'Flujo guardado (solo en memoria)',
      flow
    });
  },

  /**
   * POST /api/generate-code - Generar código Playwright desde un flujo
   */
  generateCode(req: Request, res: Response) {
    const { flow } = req.body as { flow: TestFlow };
    
    if (!flow || !flow.nodes) {
      return res.status(400).json({ error: 'Flujo inválido' });
    }
    
    const code = codeGeneratorService.generate(flow);
    res.json({ code });
  },
};
