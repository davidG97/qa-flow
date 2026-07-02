import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/auth/register
 * Registro de nuevo usuario.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son obligatorios' });
      return;
    }

    const result = await authService.register({ email, password, name });
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de registro';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/auth/login
 * Inicio de sesión.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son obligatorios' });
      return;
    }

    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de inicio de sesión';
    res.status(401).json({ error: message });
  }
});

/**
 * GET /api/auth/me
 * Devuelve el usuario autenticado.
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await authService.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
