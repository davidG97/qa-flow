import { Router, Request, Response } from 'express';
import { projectsService } from '../services/projects.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { UserRole } from '../generated/prisma/client.js';

const router = Router();

// Todas las rutas de proyectos requieren autenticación
router.use(requireAuth);

/**
 * GET /api/projects
 * Obtiene todos los proyectos del usuario (o todos si es admin).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.userRole === UserRole.ADMIN;
    const projects = await projectsService.findAll(req.userId!, isAdmin);
    res.json(projects);
  } catch (error) {
    console.error('Error obteniendo proyectos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/projects/:id
 * Obtiene un proyecto por ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.userRole === UserRole.ADMIN;
    const project = await projectsService.findById(req.params.id, req.userId!, isAdmin);
    if (!project) {
      res.status(404).json({ error: 'Proyecto no encontrado' });
      return;
    }
    res.json(project);
  } catch (error) {
    console.error('Error obteniendo proyecto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/projects
 * Crea un nuevo proyecto.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, nodes, edges, config } = req.body;

    if (!name || !nodes || !edges) {
      res.status(400).json({ error: 'Faltan campos requeridos: name, nodes, edges' });
      return;
    }

    const project = await projectsService.create(
      {
        name,
        description,
        nodes,
        edges,
        config,
      },
      req.userId!
    );

    res.status(201).json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error creando proyecto';
    console.error('Error creando proyecto:', error);
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/projects/:id
 * Actualiza un proyecto existente.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, nodes, edges, config } = req.body;
    const isAdmin = req.userRole === UserRole.ADMIN;

    const project = await projectsService.update(
      req.params.id,
      { name, description, nodes, edges, config },
      req.userId!,
      isAdmin
    );

    if (!project) {
      res.status(404).json({ error: 'Proyecto no encontrado' });
      return;
    }

    res.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error actualizando proyecto';
    console.error('Error actualizando proyecto:', error);
    res.status(message.includes('permiso') ? 403 : 500).json({ error: message });
  }
});

/**
 * DELETE /api/projects/:id
 * Elimina un proyecto.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.userRole === UserRole.ADMIN;
    const deleted = await projectsService.delete(req.params.id, req.userId!, isAdmin);
    if (!deleted) {
      res.status(404).json({ error: 'Proyecto no encontrado' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error eliminando proyecto';
    console.error('Error eliminando proyecto:', error);
    res.status(message.includes('permiso') ? 403 : 500).json({ error: message });
  }
});

/**
 * GET /api/projects/:id/flow
 * Obtiene un proyecto como TestFlow (para ejecución).
 */
router.get('/:id/flow', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.userRole === UserRole.ADMIN;
    const flow = await projectsService.toTestFlow(req.params.id, req.userId!, isAdmin);
    if (!flow) {
      res.status(404).json({ error: 'Proyecto no encontrado' });
      return;
    }
    res.json(flow);
  } catch (error) {
    console.error('Error obteniendo flow:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
