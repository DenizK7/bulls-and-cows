import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { isValidGuess, DIGIT_COUNT } from '@bulls-and-cows/shared';
import { DailyResult } from '../models/DailyResult.model.js';
import { User } from '../models/User.model.js';
import { verifyJwt } from '../services/auth.service.js';
import { evaluate } from '../utils/bulls-cows.js';
import { dailyDateKey, dailySecret } from '../utils/daily.js';

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

const MAX_DAILY_GUESSES = 20;

// GET /api/v1/daily - today's attempt state for the caller (never reveals the secret unsolved)
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const dateKey = dailyDateKey();
    const attempt = await DailyResult.findOne({ userId, dateKey }).lean();
    res.json({
      dateKey,
      guesses: attempt?.guesses ?? [],
      solved: attempt?.solved ?? false,
      maxGuesses: MAX_DAILY_GUESSES,
      secret: attempt?.solved ? dailySecret(dateKey) : null,
    });
  } catch (err) {
    console.error('Daily get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/daily/guess - submit a guess; server evaluates against the daily secret
router.post('/guess', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const { guess } = req.body as { guess?: string };
    if (!guess || !isValidGuess(guess, 9)) {
      res.status(400).json({ error: 'Invalid guess' });
      return;
    }
    const dateKey = dailyDateKey();

    let attempt = await DailyResult.findOne({ userId, dateKey });
    if (attempt?.solved) {
      res.status(409).json({ error: 'Already solved today' });
      return;
    }
    if (attempt && attempt.guesses.length >= MAX_DAILY_GUESSES) {
      res.status(409).json({ error: 'No guesses left' });
      return;
    }

    const secret = dailySecret(dateKey);
    const { bulls, cows } = evaluate(guess, secret);
    const solved = bulls === DIGIT_COUNT;

    if (!attempt) {
      try {
        attempt = await DailyResult.create({
          userId,
          dateKey,
          guesses: [{ guess, bulls, cows }],
          guessCount: 1,
          solved,
          completedAt: solved ? new Date() : null,
        });
      } catch (e: any) {
        // unique-index race: another request created it first — load and append below
        if (e?.code === 11000) attempt = await DailyResult.findOne({ userId, dateKey });
        else throw e;
        if (attempt) {
          attempt.guesses.push({ guess, bulls, cows });
          attempt.guessCount = attempt.guesses.length;
          if (solved) { attempt.solved = true; attempt.completedAt = new Date(); }
          await attempt.save();
        }
      }
    } else {
      attempt.guesses.push({ guess, bulls, cows });
      attempt.guessCount = attempt.guesses.length;
      if (solved) { attempt.solved = true; attempt.completedAt = new Date(); }
      await attempt.save();
    }

    res.json({
      bulls,
      cows,
      solved,
      guessCount: attempt?.guessCount ?? 1,
      secret: solved ? secret : null,
    });
  } catch (err) {
    console.error('Daily guess error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/daily/leaderboard?date= - today's solvers, fewest guesses first
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const dateKey = (req.query.date as string) || dailyDateKey();
    const results = await DailyResult.find({ dateKey, solved: true })
      .sort({ guessCount: 1, completedAt: 1 })
      .limit(50)
      .lean();

    const userIds = results.map((r) => r.userId);
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('displayName tag avatarUrl').lean()
      : [];
    const map: Record<string, { displayName: string; tag: string; avatarUrl: string }> = {};
    for (const u of users) map[u._id!.toString()] = { displayName: u.displayName, tag: u.tag, avatarUrl: u.avatarUrl };

    const leaderboard = results.map((r, i) => ({
      rank: i + 1,
      id: r.userId.toString(),
      ...(map[r.userId.toString()] || { displayName: 'Unknown', tag: '', avatarUrl: '' }),
      guessCount: r.guessCount,
    }));

    res.json({ dateKey, leaderboard });
  } catch (err) {
    console.error('Daily leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
