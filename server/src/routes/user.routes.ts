import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.model.js';
import { verifyJwt } from '../services/auth.service.js';

const router = Router();

function auth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  const payload = verifyJwt(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  (req as any).userId = payload.userId;
  next();
}

router.use(auth);

// GET /api/v1/users/:userId/profile - public profile + global rank position
router.get('/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      res.status(400).json({ error: 'Invalid userId' });
      return;
    }
    const user = await User.findById(userId)
      .select('displayName tag avatarUrl stats createdAt')
      .lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    // 1-based global rank by ELO (index-backed count)
    const ahead = await User.countDocuments({ 'stats.eloRating': { $gt: user.stats.eloRating } });

    res.json({
      user: {
        id: user._id,
        displayName: user.displayName,
        tag: user.tag,
        avatarUrl: user.avatarUrl,
        stats: user.stats,
        createdAt: user.createdAt,
      },
      rank: ahead + 1,
    });
  } catch (err) {
    console.error('User profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
