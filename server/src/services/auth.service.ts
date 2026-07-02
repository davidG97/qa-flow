import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from './database.service.js';
import { UserRole } from '../generated/prisma/client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'qa-flow-default-secret-change-me';
const JWT_EXPIRES_IN = '24h';

if (JWT_SECRET === 'qa-flow-default-secret-change-me') {
  console.warn(
    '⚠️  WARNING: Usando JWT_SECRET por defecto. Establece JWT_SECRET en tu .env para producción.'
  );
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

function mapUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}): AuthUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export const authService = {
  /**
   * Crea el usuario admin por defecto si la tabla de usuarios está vacía.
   * Se llama al iniciar el servidor.
   */
  async seedAdmin(): Promise<void> {
    const count = await prisma.user.count();
    if (count > 0) return;

    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@qa-flow.local',
        name: 'Admin',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   ⚠️  USUARIO ADMIN POR DEFECTO CREADO                     ║');
    console.log('║                                                            ║');
    console.log('║   Email:    admin@qa-flow.local                            ║');
    console.log('║   Password: admin123                                       ║');
    console.log('║                                                            ║');
    console.log('║   Cambia esta contraseña inmediatamente tras el primer     ║');
    console.log('║   inicio de sesión.                                        ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  },

  /**
   * Registra un nuevo usuario.
   */
  async register(input: RegisterInput): Promise<{ user: AuthUser; token: string }> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new Error('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name || null,
        passwordHash,
        role: UserRole.USER,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return { user: mapUser(user), token };
  },

  /**
   * Inicia sesión y devuelve token JWT.
   */
  async login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new Error('Credenciales inválidas');
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      user: mapUser({ id: user.id, email: user.email, name: user.name, role: user.role }),
      token,
    };
  },

  /**
   * Obtiene un usuario por ID.
   */
  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });
    return user ? mapUser(user) : null;
  },

  /**
   * Verifica un token JWT y devuelve el payload.
   */
  verifyToken(token: string): { userId: string; role: UserRole } {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole };
    return payload;
  },
};
