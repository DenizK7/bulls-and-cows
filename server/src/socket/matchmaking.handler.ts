import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from './index.js';
import { redis } from '../config/redis.js';
import { Game } from '../models/Game.model.js';
import { User } from '../models/User.model.js';

const MATCH_INTERVAL_MS = 2000;
let matchmakingTimer: ReturnType<typeof setInterval> | null = null;

function startMatchmakingLoop(io: Server) {
  if (matchmakingTimer) return;

  matchmakingTimer = setInterval(async () => {
    try {
      const queueSize = await redis.zcard('matchmaking:queue');
      if (queueSize < 2) return;

      // Pop two players (lowest timestamp = longest waiting)
      const players = await redis.zpopmin('matchmaking:queue', 2);
      if (players.length < 4) {
        // Put them back if we couldn't get 2
        for (let i = 0; i < players.length; i += 2) {
          await redis.zadd('matchmaking:queue', parseInt(players[i + 1]), players[i]);
        }
        return;
      }

      const userId1 = players[0];
      const userId2 = players[2];

      const [user1, user2] = await Promise.all([
        User.findById(userId1).lean(),
        User.findById(userId2).lean(),
      ]);

      if (!user1 || !user2) return;

      // Create game
      const game = await Game.create({
        type: 'pvp',
        matchType: 'ranked',
        status: 'waiting_secrets',
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
    } catch (err) {
      console.error('Matchmaking error:', err);
    }
  }, MATCH_INTERVAL_MS);
}

export function handleMatchmakingEvents(io: Server, socket: AuthenticatedSocket): void {
  startMatchmakingLoop(io);

  socket.on('client:matchmaking:join', async () => {
    try {
      // Check if already in queue
      const score = await redis.zscore('matchmaking:queue', socket.userId);
      if (score !== null) {
        socket.emit('server:error', { code: 'ALREADY_IN_QUEUE', message: 'Already in queue' });
        return;
      }

      await redis.zadd('matchmaking:queue', Date.now(), socket.userId);
      const position = await redis.zrank('matchmaking:queue', socket.userId);
      socket.emit('server:matchmaking:queued', { position: (position ?? 0) + 1, estimatedWait: 10 });
    } catch (err) {
      socket.emit('server:error', { code: 'QUEUE_FAILED', message: 'Failed to join queue' });
    }
  });

  socket.on('client:matchmaking:leave', async () => {
    await redis.zrem('matchmaking:queue', socket.userId);
    socket.emit('server:matchmaking:left');
  });

  // Clean up on disconnect
  socket.on('disconnect', async () => {
    await redis.zrem('matchmaking:queue', socket.userId);
  });
}
