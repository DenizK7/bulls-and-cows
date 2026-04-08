import type { Server, Socket } from 'socket.io';
import { verifyJwt } from '../services/auth.service.js';
import { User } from '../models/User.model.js';
import { handleGameEvents } from './game.handler.js';
import { handleMatchmakingEvents } from './matchmaking.handler.js';
import { redis } from '../config/redis.js';
import { Game } from '../models/Game.model.js';
import { cleanupAIGame } from '../services/ai.service.js';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  displayName: string;
  avatarUrl: string;
}

export function setupSocket(io: Server): void {
  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));

    const payload = verifyJwt(token);
    if (!payload) return next(new Error('Invalid token'));

    const user = await User.findById(payload.userId).lean();
    if (!user) return next(new Error('User not found'));

    const s = socket as AuthenticatedSocket;
    s.userId = user._id!.toString();
    s.displayName = user.displayName;
    s.avatarUrl = user.avatarUrl;
    next();
  });

  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    console.log(`Connected: ${socket.displayName} (${socket.userId})`);

    // Track online status
    await redis.sadd('users:online', socket.userId);
    await redis.sadd(`user:online:${socket.userId}`, socket.id);

    socket.emit('server:connected', {
      userId: socket.userId,
      displayName: socket.displayName,
    });

    // Register event handlers
    handleGameEvents(io, socket);
    handleMatchmakingEvents(io, socket);

    socket.on('disconnect', async () => {
      console.log(`Disconnected: ${socket.displayName}`);
      await redis.srem(`user:online:${socket.userId}`, socket.id);
      const remaining = await redis.scard(`user:online:${socket.userId}`);
      if (remaining === 0) {
        await redis.srem('users:online', socket.userId);
      }

      // Abandon active games
      const activeGames = await Game.find({
        status: { $in: ['waiting_secrets', 'in_progress'] },
        $or: [
          { 'players.host.userId': socket.userId },
          { 'players.challenger.userId': socket.userId },
        ],
      });

      for (const game of activeGames) {
        const gameId = game._id!.toString();
        const isHost = game.players.host.userId.toString() === socket.userId;
        const opponentId = isHost
          ? game.players.challenger.userId.toString()
          : game.players.host.userId.toString();

        game.status = 'abandoned';
        game.completedAt = new Date();
        game.result = {
          winnerId: opponentId === 'AI' ? null : opponentId,
          reason: 'opponent_quit',
          hostGuessCount: game.players.host.guesses.length,
          challengerGuessCount: game.players.challenger.guesses.length,
          eloChange: null,
        };
        await game.save();

        if (game.type === 'ai') cleanupAIGame(gameId);

        // Notify opponent if PvP
        if (opponentId !== 'AI') {
          io.to(`game:${gameId}`).emit('server:game:over', {
            winnerId: opponentId,
            reason: 'opponent_quit',
            hostSecret: game.players.host.secret,
            challengerSecret: game.players.challenger.secret,
            eloChange: null,
            stats: {
              hostGuesses: game.players.host.guesses.length,
              challengerGuesses: game.players.challenger.guesses.length,
            },
          });
        }
      }
    });
  });
}
