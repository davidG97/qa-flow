import { Request, Response } from 'express';
import { pickerService } from '../services/picker.service.js';
import { getWebSocketServer } from '../websocket/index.js';

export const pickerController = {
  /**
   * Inicia una sesión de picker con ejecución de nodos previos
   * POST /api/picker/start
   * Body: { targetNodeId, nodes, edges, cdpUrl? }
   */
  async startSession(req: Request, res: Response) {
    try {
      const { targetNodeId, nodes, edges, cdpUrl } = req.body;
      const wss = getWebSocketServer();

      if (!targetNodeId || !nodes || !edges) {
        return res.status(400).json({ error: 'targetNodeId, nodes and edges are required' });
      }

      const sendProgress = (message: string) => {
        if (wss) {
          const msg = JSON.stringify({ type: 'picker:progress', message });
          wss.clients.forEach((client) => {
            if (client.readyState === 1) client.send(msg);
          });
        }
      };

      const sessionId = await pickerService.startSessionWithFlow(
        targetNodeId,
        nodes,
        edges,
        (result) => {
          if (wss) {
            const message = JSON.stringify({
              type: 'picker:result',
              sessionId,
              result,
              cancelled: result === null,
            });
            wss.clients.forEach((client) => {
              if (client.readyState === 1) client.send(message);
            });
          }
        },
        sendProgress,
        cdpUrl
      );

      res.json({
        success: true,
        sessionId,
        message: 'Running previous nodes and opening selector.',
      });
    } catch (error) {
      console.error('Error starting picker session:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error starting visual picker',
      });
    }
  },

  /**
   * Cancela una sesión de picker
   * POST /api/picker/cancel/:sessionId
   */
  async cancelSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      await pickerService.closeSession(sessionId);
      res.json({ success: true, message: 'Session cancelled' });
    } catch (error) {
      console.error('Error cancelling picker session:', error);
      res.status(500).json({ error: 'Error cancelling session' });
    }
  },

  /**
   * Obtiene el estado de una sesión
   * GET /api/picker/status/:sessionId
   */
  async getSessionStatus(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const session = pickerService.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        sessionId,
        status: session.status,
        selectedSelector: session.selectedSelector,
      });
    } catch (error) {
      console.error('Error getting picker status:', error);
      res.status(500).json({ error: 'Error getting session status' });
    }
  },

  /**
   * Inicia una sesión de picker interactivo con screencast
   * Funciona en Docker sin configuración adicional
   * POST /api/picker/interactive/start
   * Body: { targetNodeId, nodes, edges }
   */
  async startInteractiveSession(req: Request, res: Response) {
    try {
      const { targetNodeId, nodes, edges } = req.body;
      const wss = getWebSocketServer();

      if (!targetNodeId || !nodes || !edges) {
        return res.status(400).json({ error: 'targetNodeId, nodes and edges are required' });
      }

      const sendProgress = (message: string) => {
        if (wss) {
          const msg = JSON.stringify({ type: 'picker:progress', message });
          wss.clients.forEach((client) => {
            if (client.readyState === 1) client.send(msg);
          });
        }
      };

      const sessionId = await pickerService.startInteractiveSession(
        targetNodeId,
        nodes,
        edges,
        (sid, frameBase64) => {
          // Send screencast frame to all clients
          if (wss) {
            const msg = JSON.stringify({
              type: 'picker:frame',
              sessionId: sid,
              frame: frameBase64,
            });
            wss.clients.forEach((client) => {
              if (client.readyState === 1) {
                client.send(msg);
              }
            });
          }
        },
        (result) => {
          if (wss) {
            const message = JSON.stringify({
              type: 'picker:result',
              sessionId,
              result,
              cancelled: result === null,
            });
            wss.clients.forEach((client) => {
              if (client.readyState === 1) client.send(message);
            });
          }
        },
        sendProgress
      );

      res.json({
        success: true,
        sessionId,
        message: 'Interactive session started. Click on an element.',
        interactive: true,
      });
    } catch (error) {
      console.error('Error starting interactive picker:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error starting interactive picker',
      });
    }
  },

  /**
   * Selecciona elemento en coordenadas específicas
   * POST /api/picker/interactive/select
   * Body: { sessionId, x, y }
   */
  async selectAtCoordinates(req: Request, res: Response) {
    try {
      const { sessionId, x, y } = req.body;

      if (!sessionId || typeof x !== 'number' || typeof y !== 'number') {
        return res.status(400).json({ error: 'sessionId, x and y are required' });
      }

      const result = await pickerService.selectAtCoordinates(sessionId, x, y);

      if (!result) {
        return res.status(404).json({ error: 'No element found at those coordinates' });
      }

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error('Error selecting element:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error selecting element',
      });
    }
  },

  /**
   * Get element info at coordinates for hover highlight
   * POST /api/picker/interactive/hover
   * Body: { sessionId, x, y }
   */
  async hoverAtCoordinates(req: Request, res: Response) {
    try {
      const { sessionId, x, y } = req.body;
      if (!sessionId || typeof x !== 'number' || typeof y !== 'number') {
        return res.status(400).json({ error: 'sessionId, x and y are required' });
      }
      const result = await pickerService.hoverAtCoordinates(sessionId, x, y);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: 'Error in hover' });
    }
  },

  /**
   * Scroll in interactive picker
   * POST /api/picker/interactive/scroll
   * Body: { sessionId, x, y, deltaY }
   */
  async scroll(req: Request, res: Response) {
    try {
      const { sessionId, x, y, deltaY } = req.body;

      if (!sessionId || typeof x !== 'number' || typeof y !== 'number' || typeof deltaY !== 'number') {
        return res.status(400).json({ error: 'sessionId, x, y, and deltaY are required' });
      }

      await pickerService.scroll(sessionId, x, y, deltaY);
      res.json({ success: true });
    } catch (error) {
      console.error('Error scrolling:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error scrolling',
      });
    }
  },
};
