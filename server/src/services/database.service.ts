import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// Configuración de la base de datos
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  // Convertir formato SQLite de Prisma a formato libsql
  if (url.startsWith('file:')) {
    const path = url.replace('file:', '');
    return `file:${path}`;
  }
  return url;
};

// Crear adaptador con la configuración
const adapter = new PrismaLibSql({
  url: getDatabaseUrl(),
});

// Singleton del cliente Prisma para evitar múltiples conexiones
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Conectar a la base de datos
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    throw error;
  }
}

/**
 * Desconectar de la base de datos
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('🔌 Desconectado de la base de datos');
}

export default prisma;
