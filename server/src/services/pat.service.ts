import { randomBytes, createHash } from 'node:crypto';
import prisma from './database.service.js';
import { UserRole } from '../generated/prisma/client.js';

const TOKEN_PREFIX = 'qfpat_';

/**
 * Personal Access Token service for CLI authentication.
 * Tokens are hashed with SHA256 before storage - plain token shown only once at creation.
 */
export const patService = {
  /**
   * Creates a new PAT. Returns the plain token (only time it's visible).
   */
  async create(userId: string, name: string, expiresAt?: Date): Promise<{ id: string; token: string }> {
    const rawToken = randomBytes(32).toString('base64url');
    const plainToken = `${TOKEN_PREFIX}${rawToken}`;
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');

    const pat = await prisma.personalAccessToken.create({
      data: {
        userId,
        name,
        tokenHash,
        expiresAt,
      },
    });

    return { id: pat.id, token: plainToken };
  },

  /**
   * Lists all tokens for a user (without hashes).
   */
  async list(userId: string) {
    return prisma.personalAccessToken.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Revokes (deletes) a token.
   */
  async revoke(userId: string, tokenId: string): Promise<boolean> {
    const result = await prisma.personalAccessToken.deleteMany({
      where: { id: tokenId, userId },
    });
    return result.count > 0;
  },

  /**
   * Validates a token and returns user info if valid, null otherwise.
   * Updates lastUsedAt on success.
   */
  async validate(plainToken: string): Promise<{ userId: string; role: UserRole } | null> {
    if (!plainToken.startsWith(TOKEN_PREFIX)) return null;

    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const pat = await prisma.personalAccessToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, user: { select: { role: true } } },
    });

    if (!pat) return null;
    if (pat.expiresAt && pat.expiresAt < new Date()) return null;

    // Update lastUsedAt (fire and forget)
    prisma.personalAccessToken.update({
      where: { id: pat.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => { /* ignore */ });

    return { userId: pat.userId, role: pat.user.role };
  },
};
