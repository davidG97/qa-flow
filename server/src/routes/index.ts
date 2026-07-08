import { Router } from 'express';
import executionRoutes from './execution.routes.js';
import flowRoutes from './flow.routes.js';
import reportRoutes from './report.routes.js';
import projectsRoutes from './projects.routes.js';
import testRunsRoutes from './test-runs.routes.js';
import cliRoutes from './cli.routes.js';
import pickerRoutes from './picker.routes.js';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';

const router = Router();

// Autenticación
router.use('/auth', authRoutes);

// Administración de usuarios
router.use('/users', usersRoutes);

// Montar todas las rutas
router.use('/', executionRoutes);
router.use('/', flowRoutes);
router.use('/', reportRoutes);

// Rutas de base de datos
router.use('/projects', projectsRoutes);
router.use('/test-runs', testRunsRoutes);

// Rutas CLI runner
router.use('/cli', cliRoutes);

// Selector visual
router.use('/picker', pickerRoutes);

export default router;
