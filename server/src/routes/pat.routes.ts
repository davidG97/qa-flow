import { Router, Request, Response } from 'express';
import { patService } from '../services/pat.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// All PAT routes require authentication
router.use(requireAuth);

/**
 * POST /api/tokens
 * Create a new personal access token.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, expiresAt } = req.body as { name?: string; expiresAt?: string };

    if (!name?.trim()) {
      res.status(400).json({ error: 'Token name is required' });
      return;
    }

    const expiry = expiresAt ? new Date(expiresAt) : undefined;
    const result = await patService.create(req.userId!, name.trim(), expiry);

    res.status(201).json({
      id: result.id,
      token: result.token, // Only time plain token is returned
      message: 'Save this token now - it will not be shown again',
    });
  } catch (error) {
    console.error('Error creating PAT:', error);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

/**
 * GET /api/tokens
 * List all tokens for the authenticated user.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tokens = await patService.list(req.userId!);
    res.json(tokens);
  } catch (error) {
    console.error('Error listing PATs:', error);
    res.status(500).json({ error: 'Failed to list tokens' });
  }
});

/**
 * DELETE /api/tokens/:id
 * Revoke a token.
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await patService.revoke(req.userId!, req.params.id);

    if (!deleted) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    res.json({ message: 'Token revoked' });
  } catch (error) {
    console.error('Error revoking PAT:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

export default router;
