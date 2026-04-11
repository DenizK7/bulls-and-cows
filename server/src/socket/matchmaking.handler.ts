import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from './index.js';
import { redis } from '../config/redis.js';
import { Game } from '../models/Game.model.js';
import { User } from '../models/User.model.js';

const MATCH_INTERVAL_MS = 2000;
let matchmakingTimer: ReturnType<typeof setInterval> | null = null;

const QUEUE_KEYS = [
  'matchmaking:queue:digits',
  'matchmaking:queue:colors:5',
  'matchmaking:queue:colors:6',
  'matchmaking:queue:colors:7',
  'matchmaking:queue:colors:8',
];

function queueKey(colorCount: number | null): string {
  return colorCount == null ? 'matchmaking:queue:digits' : `matchmaking:queue:colors:${colorCount}`;
}

function colorCountFromKey(key: string): number | null {
  if (key === 'matchmaking:queue:digits') return null;
  const m = key.match(/colors:(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

async function tryMatchInQueue(io: Server, key: string) {
  const queueSize = await redis.zcard(key);
  if (queueSize < 2) return;

  const players = await redis.zpopmin(key, 2);
  if (players.length < 4) {
    for (let i = 0; i < players.length; i += 2) {
      await redis.zadd(key, parseInt(players[i + 1]), players[i]);
    }
    return;
  }

  const userId1 = players[0];
  const userId2 = players[2];
  const colorCount = colorCountFromKey(key);

  const [user1, user2] = await Promise.all([
    User.findById(userId1).lean(),
    User.findById(userId2).lean(),
  ]);

  if (!user1 || !user2) return;

  const game = await Game.create({
    type: 'pvp',
    matchType: 'ranked',
    status: 'waiting_secrets',
    colorCount,
    players: {
      host: { userId: userId1, secret: '', secretSet: false, guesses: [], guessedThisRound: false },
      challenger: { userId: userId2, secret: '', secretSet: false, guesses: [], guessedThisRound: false },
    },
  });

  const gameId = game._id!.toString();

  // Notify both players
  const sockets = await io.fetchSockets();
  for (const s of sockets) {
    const as = s as unknown as AuthenticatedSocket;
    if (as.userId === userId1) {
      s.join(`game:${gameId}`);
      s.emit('server:matchmaking:found', {
        gameId,
        opponent: { userId: user2._id!.toString(), displayName: user2.displayName, avatarUrl: user2.avatarUrl, eloRating: user2.stats.eloRating },
      });
    } else if (as.userId === userId2) {
      s.join(`game:${gameId}`);
      s.emit('server:matchmaking:found', {
        gameId,
        opponent: { userId: user1._id!.toString(), displayName: user1.displayName, avatarUrl: user1.avatarUrl, eloRating: user1.stats.eloRating },
      });
    }
  }
}

function startMatchmakingLoop(io: Server) {
  if (matchmakingTimer) return;
  matchmakingTimer = setInterval(async () => {
    try {
      for (const key of QUEUE_KEYS) {
        await tryMatchInQueue(io, key);
      }
    } catch (err) {
      console.error('Matchmaking error:', err);
    }
  }, MATCH_INTERVAL_MS);
}

async function removeFromAllQueues(userId: string) {
  for (const key of QUEUE_KEYS) {
    await redis.zrem(key, userId);
  }
}

export function handleMatchmakingEvents(io: Server, socket: AuthenticatedSocket): void {
  startMatchmakingLoop(io);

  socket.on('client:matchmaking:join', async ({ colorCount }: { colorCount?: number | null } = {}) => {
    try {
      const validColorCount = (typeof colorCount === 'number' && [5, 6, 7, 8].includes(colorCount)) ? colorCount : null;
      const key = queueKey(validColorCount);

      // Check if already in any queue, remove first to avoid stale entries
      await removeFromAllQueues(socket.userId);

      await redis.zadd(key, Date.now(), socket.userId);
      const position = await redis.zrank(key, socket.userId);
      socket.emit('server:matchmaking:queued', { position: (position ?? 0) + 1, estimatedWait: 10 });
    } catch (err) {
      socket.emit('server:error', { code: 'QUEUE_FAILED', message: 'Failed to join queue' });
    }
  });

  socket.on('client:matchmaking:leave', async () => {
    await removeFromAllQueues(socket.userId);
    socket.emit('server:matchmaking:left');
  });

  // Clean up on disconnect
  socket.on('disconnect', async () => {
    await removeFromAllQueues(socket.userId);
  });
}
