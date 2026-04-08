import type { Server, Socket } from 'socket.io';
import { verifyJwt } from '../services/auth.service.js';
import { User } from '../models/User.model.js';
import { handleGameEvents } from './game.handler.js';
import { handleMatchmakingEvents } from './matchmaking.handler.js';
import { redis } from '../config/redis.js';

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
    });
  });
}
