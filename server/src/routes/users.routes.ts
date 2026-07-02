import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../services/database.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { UserRole } from '../generated/prisma/client.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

/**
 * GET /api/users
 * Lista todos los usuarios (admin).
 */
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/users
 * Crea un usuario (admin).
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son obligatorios' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'El email ya está registrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userData = {
      email,
      name: name || null,
      passwordHash,
      role: role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER,
    };

    const user = await prisma.user.create({
      data: userData,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/users/:id
 * Actualiza un usuario (admin o self).
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    const isAdmin = req.userRole === UserRole.ADMIN;
    const isSelf = req.userId === id;

    if (!isAdmin && !isSelf) {
      res.status(403).json({ error: 'No tienes permiso para editar este usuario' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Solo admin puede cambiar role y editar otros usuarios
    if (!isAdmin && (role !== undefined || email !== undefined)) {
      res.status(403).json({ error: 'Solo un administrador puede modificar el rol o el email' });
      return;
    }

    const data: {
      name?: string | null;
      email?: string;
      passwordHash?: string;
      role?: UserRole;
    } = {};

    if (name !== undefined) data.name = name || null;
    if (email !== undefined && isAdmin) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    if (role !== undefined && isAdmin) data.role = role;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    res.json(user);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /api/users/:id
 * Elimina un usuario (admin).
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (req.userId === id) {
      res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
