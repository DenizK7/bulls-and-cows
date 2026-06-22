import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
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

const MAX_LIMIT = 100;

// GET /api/v1/leaderboard?limit= - top players by ELO + the caller's own rank
router.get('/', async (req: Request, res: Response) => {
  try {
    const callerId = (req as any).userId as string;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, MAX_LIMIT);

    // Index-backed sort on { 'stats.eloRating': -1 }
    const top = await User.find({})
      .sort({ 'stats.eloRating': -1, _id: 1 })
      .limit(limit)
      .select('displayName tag avatarUrl stats.eloRating stats.gamesWon stats.gamesLost stats.gamesPlayed')
      .lean();

    const players = top.map((u, i) => ({
      rank: i + 1,
      id: u._id,
      displayName: u.displayName,
      tag: u.tag,
      avatarUrl: u.avatarUrl,
      elo: u.stats.eloRating,
      wins: u.stats.gamesWon,
      losses: u.stats.gamesLost,
      gamesPlayed: u.stats.gamesPlayed,
    }));

    // Caller's own rank (may be outside the returned page)
    const me = await User.findById(callerId).select('stats.eloRating').lean();
    const myRank = me
      ? (await User.countDocuments({ 'stats.eloRating': { $gt: me.stats.eloRating } })) + 1
      : null;

    res.json({ players, myRank });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
