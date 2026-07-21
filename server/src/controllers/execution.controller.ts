import { Request, Response } from 'express';
import { FlowExecutor } from '../services/executor.service.js';
import { ReporterService } from '../services/reporter.service.js';
import { RunFlowRequest, ExecutionStatus } from '../types/index.js';
import { notifyClients, notifyScreencastFrame, cleanupExecution } from '../websocket/index.js';

// Almacén de ejecuciones activas
const executions = new Map<string, ExecutionStatus>();

export const executionController = {
  /**
   * POST /api/run - Ejecutar un flujo
   */
  async run(req: Request, res: Response) {
    try {
      const { flow, options } = req.body as RunFlowRequest;
      
      if (!flow?.nodes || !flow?.edges) {
        return res.status(400).json({ error: 'Invalid flow' });
      }

      // Crear el ejecutor con callback para notificar progreso y screencast
      const executor = new FlowExecutor({
        slowMo: options?.slowMo ?? 100,
        timeout: options?.timeout ?? 30000,
        onProgress: (status) => {
          executions.set(executor.getExecutionId(), status);
          notifyClients(executor.getExecutionId(), status);
        },
        onScreencastFrame: (frameData) => {
          notifyScreencastFrame(executor.getExecutionId(), frameData);
        },
      });

      const executionId = executor.getExecutionId();
      
      // Build WebSocket URL from request host (works with any port)
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
      const host = req.headers.host || 'localhost:3001';
      
      // Respond immediately with execution ID
      res.json({ 
        executionId, 
        message: 'Execution started',
        wsUrl: `${protocol}://${host}`,
      });

      // Ejecutar en background
      console.log(`🚀 Starting execution: ${executionId}`);
      const finalStatus = await executor.execute(flow);
      executions.set(executionId, finalStatus);
      
      console.log(`✅ Execution completed: ${executionId} - ${finalStatus.status}`);
      
      // Generar reporte automáticamente
      try {
        const report = ReporterService.generateReport(executionId, finalStatus, flow);
        console.log(`📊 Report generated: ${report.id} (${report.status})`);
        
        // Notificar a los clientes que hay un reporte disponible
        notifyClients(executionId, {
          ...finalStatus,
          reportId: report.id,
        } as ExecutionStatus & { reportId: string });
      } catch (reportError) {
        console.error('Error generating report:', reportError);
      }
      
      // Limpiar suscripciones después de un tiempo
      cleanupExecution(executionId);

    } catch (error) {
      console.error('Error running flow:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  /**
   * GET /api/status/:executionId - Obtener estado de una ejecución
   */
  getStatus(req: Request, res: Response) {
    const { executionId } = req.params;
    const status = executions.get(executionId);
    
    if (!status) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    res.json(status);
  },

  /**
   * GET /api/executions - Listar ejecuciones recientes
   */
  list(_req: Request, res: Response) {
    const recentExecutions = Array.from(executions.entries())
      .slice(-20)
      .map(([id, status]) => ({
        id,
        flowId: status.flowId,
        status: status.status,
        startedAt: status.startedAt,
        completedAt: status.completedAt,
        resultsCount: status.results.length,
      }));
    
    res.json(recentExecutions);
  },
};
