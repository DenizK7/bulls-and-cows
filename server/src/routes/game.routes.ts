import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Game } from '../models/Game.model.js';
import { User } from '../models/User.model.js';
import { verifyJwt } from '../services/auth.service.js';

const router = Router();

// Auth middleware - extract userId from Bearer token (same pattern as friend.routes)
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

const MAX_LIMIT = 50;

// Build a viewer-perspective summary row for a finished game.
// `g` is a lean (plain-object) Game doc — typed loosely to avoid Mongoose lean-type friction.
function buildHistoryRow(
  g: any,
  viewerId: string,
  userMap: Record<string, { displayName: string; tag: string; avatarUrl: string }>,
) {
  const isHost = g.players.host.userId.toString() === viewerId;
  const opp = isHost ? g.players.challenger : g.players.host;
  const oppId = opp.userId.toString();
  const result = g.result || {};
  const winnerId = result.winnerId != null ? result.winnerId.toString() : null;
  const draw = result.reason === 'draw';
  const won = winnerId === viewerId;
  const eloDelta = result.eloChange ? (isHost ? result.eloChange.host : result.eloChange.challenger) : null;
  const myGuesses = (isHost ? result.hostGuessCount : result.challengerGuessCount)
    ?? (isHost ? g.players.host.guesses.length : g.players.challenger.guesses.length);
  const oppGuesses = (isHost ? result.challengerGuessCount : result.hostGuessCount)
    ?? (isHost ? g.players.challenger.guesses.length : g.players.host.guesses.length);

  const opponent = oppId === 'AI'
    ? { id: 'AI', displayName: 'AI', tag: '', avatarUrl: '' }
    : { id: oppId, ...(userMap[oppId] || { displayName: 'Unknown', tag: '', avatarUrl: '' }) };

  return {
    id: g._id,
    type: g.type,
    matchType: g.matchType,
    colorCount: g.colorCount,
    reason: result.reason ?? null,
    outcome: draw ? 'draw' : won ? 'win' : 'loss',
    myGuesses,
    oppGuesses,
    eloDelta,
    opponent,
    abandoned: g.status === 'abandoned',
    createdAt: g.createdAt,
  };
}

// GET /api/v1/games/history?userId=&cursor=&limit= - finished games for a user (default: caller)
router.get('/history', async (req: Request, res: Response) => {
  try {
    const callerId = (req as any).userId as string;
    const userId = (req.query.userId as string) || callerId;
    if (!mongoose.isValidObjectId(userId)) {
      res.status(400).json({ error: 'Invalid userId' });
      return;
    }
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, MAX_LIMIT);
    const cursor = req.query.cursor as string | undefined;

    const query: Record<string, unknown> = {
      status: { $in: ['completed', 'abandoned'] },
      $or: [{ 'players.host.userId': userId }, { 'players.challenger.userId': userId }],
    };
    if (cursor) {
      const d = new Date(cursor);
      if (!isNaN(d.getTime())) query.createdAt = { $lt: d };
    }

    const games = await Game.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();
    const hasMore = games.length > limit;
    const page = games.slice(0, limit);

    // Resolve real opponent names in one batch
    const oppIds = new Set<string>();
    for (const g of page) {
      const isHost = g.players.host.userId.toString() === userId;
      const oppId = (isHost ? g.players.challenger : g.players.host).userId.toString();
      if (oppId !== 'AI') oppIds.add(oppId);
    }
    const users = oppIds.size
      ? await User.find({ _id: { $in: [...oppIds] } }).select('displayName tag avatarUrl').lean()
      : [];
    const userMap: Record<string, { displayName: string; tag: string; avatarUrl: string }> = {};
    for (const u of users) {
      userMap[u._id!.toString()] = { displayName: u.displayName, tag: u.tag, avatarUrl: u.avatarUrl };
    }

    const rows = page.map((g) => buildHistoryRow(g, userId, userMap));
    const last = page[page.length - 1] as { createdAt?: Date } | undefined;
    res.json({ games: rows, nextCursor: hasMore && last?.createdAt ? last.createdAt : null });
  } catch (err) {
    console.error('Game history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/games/:gameId - full guess-by-guess detail (participant only)
router.get('/:gameId', async (req: Request, res: Response) => {
  try {
    const callerId = (req as any).userId as string;
    const { gameId } = req.params;
    if (!mongoose.isValidObjectId(gameId)) {
      res.status(400).json({ error: 'Invalid gameId' });
      return;
    }
    const g = await Game.findById(gameId).lean();
    if (!g) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    const hostId = g.players.host.userId.toString();
    const challId = g.players.challenger.userId.toString();
    if (callerId !== hostId && callerId !== challId) {
      res.status(403).json({ error: 'Not a participant' });
      return;
    }
    const isHost = callerId === hostId;
    const me = isHost ? g.players.host : g.players.challenger;
    const opp = isHost ? g.players.challenger : g.players.host;

    res.json({
      game: {
        id: g._id,
        type: g.type,
        matchType: g.matchType,
        colorCount: g.colorCount,
        result: g.result,
        createdAt: g.createdAt,
        completedAt: g.completedAt,
        myRole: isHost ? 'host' : 'challenger',
        me: { secret: me.secret, guesses: me.guesses },
        opponent: {
          userId: opp.userId,
          secret: opp.secret,
          guesses: opp.guesses,
        },
      },
    });
  } catch (err) {
    console.error('Game detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
