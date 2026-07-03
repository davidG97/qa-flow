import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { v4 as uuidv4 } from 'uuid';
import type { ExecutionStatus } from '../types/index.js';

// Almacén de clientes suscritos por ejecución
const wsClients = new Map<string, Set<WebSocket>>();

// Referencia al servidor WebSocket
let wssInstance: WebSocketServer | null = null;

export function getWebSocketServer(): WebSocketServer | null {
  return wssInstance;
}

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server });
  wssInstance = wss;

  wss.on('connection', (ws: WebSocket) => {
    const clientId = uuidv4();
    console.log(`🔌 Cliente WebSocket conectado: ${clientId}`);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Suscribirse a actualizaciones de una ejecución
        if (data.type === 'subscribe' && data.executionId) {
          subscribeToExecution(data.executionId, ws);
          console.log(`📡 Cliente suscrito a ejecución: ${data.executionId}`);
        }
      } catch (error) {
        console.error('Error procesando mensaje WS:', error);
      }
    });

    ws.on('close', () => {
      console.log(`🔌 Cliente WebSocket desconectado: ${clientId}`);
      // Limpiar suscripciones
      wsClients.forEach((clients) => {
        clients.delete(ws);
      });
    });

    // Enviar confirmación de conexión
    ws.send(JSON.stringify({ type: 'connected', clientId }));
  });

  return wss;
}

export function subscribeToExecution(executionId: string, ws: WebSocket): void {
  if (!wsClients.has(executionId)) {
    wsClients.set(executionId, new Set());
  }
  wsClients.get(executionId)?.add(ws);
}

export function notifyClients(executionId: string, status: ExecutionStatus): void {
  const clients = wsClients.get(executionId);
  if (clients) {
    const message = JSON.stringify({ type: 'status', executionId, status });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export function notifyScreencastFrame(executionId: string, frameData: string): void {
  const clients = wsClients.get(executionId);
  if (clients) {
    const message = JSON.stringify({ type: 'screencast-frame', executionId, frame: frameData });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export function cleanupExecution(executionId: string, delayMs: number = 60000): void {
  setTimeout(() => {
    wsClients.delete(executionId);
  }, delayMs);
}
