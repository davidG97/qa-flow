import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { UserRole } from '../generated/prisma/client.js';

// Extender tipos de Express para incluir userId y userRole
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

/**
 * Middleware: requiere autenticación vía Bearer token.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: token required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = authService.verifyToken(token);
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

/**
 * Middleware: requiere rol ADMIN.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Forbidden: admin role required' });
    return;
  }
  next();
}
