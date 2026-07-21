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

// Authentication
router.use('/auth', authRoutes);

// User management
router.use('/users', usersRoutes);

// Mount all routes
router.use('/', executionRoutes);
router.use('/', flowRoutes);
router.use('/', reportRoutes);

// Database routes
router.use('/projects', projectsRoutes);
router.use('/test-runs', testRunsRoutes);

// CLI runner routes
router.use('/cli', cliRoutes);

// Visual selector
router.use('/picker', pickerRoutes);

export default router;
