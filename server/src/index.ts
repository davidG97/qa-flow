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

// Configurar WebSocket
setupWebSocket(server);

// Middleware
app.use(cors());
app.use(express.json({ limit: config.jsonLimit }));

// Montar rutas API
app.use('/api', routes);

// Servir frontend estático en producción
if (process.env.NODE_ENV === 'production') {
  // El frontend está en /app/dist en Docker, o ../dist en desarrollo
  const frontendPath = existsSync(path.join(__dirname, '../../dist'))
    ? path.join(__dirname, '../../dist')
    : path.join(__dirname, '../../../dist');
  
  if (existsSync(frontendPath)) {
    console.log(`📁 Sirviendo frontend desde: ${frontendPath}`);
    app.use(express.static(frontendPath));
    
    // SPA fallback - todas las rutas no-API van al index.html
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  } else {
    console.warn('⚠️  Frontend no encontrado en:', frontendPath);
  }
}

// Iniciar servidor
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
  ║   Database:  ✅ Conectada                             ║
  ║                                                       ║
  ║   Endpoints:                                          ║
  ║   - POST /api/auth/register    Registro               ║
  ║   - POST /api/auth/login       Iniciar sesión         ║
  ║   - GET  /api/auth/me          Usuario actual         ║
  ║   - GET  /api/users            Listar usuarios        ║
  ║   - POST /api/users            Crear usuario          ║
  ║   - PUT  /api/users/:id        Editar usuario         ║
  ║   - DEL  /api/users/:id        Eliminar usuario       ║
  ║   - POST /api/run              Ejecutar flujo         ║
  ║   - GET  /api/status/:id       Estado de ejecución    ║
  ║   - GET  /api/executions       Listar ejecuciones     ║
  ║   - POST /api/generate-code    Generar código         ║
  ║   - POST /api/record/start     Iniciar grabación      ║
  ║   - GET  /api/record/status    Estado grabación       ║
  ║   - GET  /api/record/nodes     Obtener nodos grabados ║
  ║   - POST /api/parse-code       Parsear código         ║
  ║   - GET  /api/health           Health check           ║
  ║   - GET  /api/reports          Listar reportes        ║
  ║   - GET  /api/reports/:id      Obtener reporte        ║
  ║                                                       ║
  ║   Base de datos:                                      ║
  ║   - GET/POST   /api/projects      CRUD proyectos      ║
  ║   - GET/PUT/DEL /api/projects/:id                     ║
  ║   - GET  /api/test-runs           Ejecuciones         ║
  ║   - GET  /api/test-runs/:id/report                    ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await disconnectDatabase();
  process.exit(0);
});

startServer();

export { app, server };
