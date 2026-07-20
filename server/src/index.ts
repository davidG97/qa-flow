import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { config } from './config/index.js';
import { setupWebSocket } from './websocket/index.js';
import routes from './routes/index.js';
import { connectDatabase, disconnectDatabase } from './services/database.service.js';
import { authService } from './services/auth.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Configure WebSocket
setupWebSocket(server);

// Middleware
app.use(cors());
app.use(express.json({ limit: config.jsonLimit }));

// Mount API routes
app.use('/api', routes);

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  // Frontend is in /app/dist in Docker, or ../dist in development
  const frontendPath = existsSync(path.join(__dirname, '../../dist'))
    ? path.join(__dirname, '../../dist')
    : path.join(__dirname, '../../../dist');
  
  if (existsSync(frontendPath)) {
    console.log(`📁 Serving frontend from: ${frontendPath}`);
    app.use(express.static(frontendPath));
    
    // SPA fallback - all non-API routes go to index.html
    app.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  } else {
    console.warn('⚠️  Frontend not found at:', frontendPath);
  }
}

// Start server
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDatabase();

    // Crear admin por defecto si no hay usuarios
    await authService.seedAdmin();

    server.listen(config.port, () => {
      console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   🧪 QA Flow Backend Server                           ║
  ║                                                       ║
  ║   REST API:  http://localhost:${config.port}                 ║
  ║   WebSocket: ws://localhost:${config.port}                   ║
  ║   Database:  ✅ Connected                             ║
  ║                                                       ║
  ║   Endpoints:                                          ║
  ║   - POST /api/auth/register    Register               ║
  ║   - POST /api/auth/login       Login                  ║
  ║   - GET  /api/auth/me          Current user           ║
  ║   - GET  /api/users            List users             ║
  ║   - POST /api/users            Create user            ║
  ║   - PUT  /api/users/:id        Edit user              ║
  ║   - DEL  /api/users/:id        Delete user            ║
  ║   - POST /api/run              Run flow               ║
  ║   - GET  /api/status/:id       Execution status       ║
  ║   - GET  /api/executions       List executions        ║
  ║   - POST /api/generate-code    Generate code          ║
  ║   - POST /api/record/start     Start recording        ║
  ║   - GET  /api/record/status    Recording status       ║
  ║   - GET  /api/record/nodes     Get recorded nodes     ║
  ║   - POST /api/parse-code       Parse code             ║
  ║   - GET  /api/health           Health check           ║
  ║   - GET  /api/reports          List reports           ║
  ║   - GET  /api/reports/:id      Get report             ║
  ║                                                       ║
  ║   Database:                                           ║
  ║   - GET/POST   /api/projects      CRUD projects       ║
  ║   - GET/PUT/DEL /api/projects/:id                     ║
  ║   - GET  /api/test-runs           Executions          ║
  ║   - GET  /api/test-runs/:id/report                    ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Closing server...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Closing server...');
  await disconnectDatabase();
  process.exit(0);
});

startServer();

export { app, server };
