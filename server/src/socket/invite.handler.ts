import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from './index.js';
import { redis } from '../config/redis.js';
import { Game } from '../models/Game.model.js';
import { User } from '../models/User.model.js';

const INVITE_TTL = 30; // seconds
const readyStates = new Map<string, Set<string>>(); // inviteId -> set of ready userIds

export function handleInviteEvents(io: Server, socket: AuthenticatedSocket): void {
  // Send invite to a friend
  socket.on('client:invite:send', async ({ toUserId, turnTime, colorCount }: { toUserId: string; turnTime: number; colorCount?: number | null }) => {
    try {
      const validTimes = [30000, 60000, 120000];
      const turnTimeMs = validTimes.includes(turnTime) ? turnTime : 60000;
      const validColorCount = (typeof colorCount === 'number' && [5, 6, 7, 8].includes(colorCount)) ? colorCount : null;

      const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await redis.hset(`invite:${inviteId}`, {
        fromUserId: socket.userId,
        fromName: socket.displayName,
        fromAvatar: socket.avatarUrl,
        toUserId,
        turnTimeMs: String(turnTimeMs),
        colorCount: validColorCount == null ? '' : String(validColorCount),
        status: 'pending',
      });
      await redis.expire(`invite:${inviteId}`, INVITE_TTL);

      // Notify recipient
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        const as = s as unknown as AuthenticatedSocket;
        if (as.userId === toUserId) {
          s.emit('server:invite:received', {
            inviteId,
            from: { userId: socket.userId, displayName: socket.displayName, avatarUrl: socket.avatarUrl },
            turnTimeMs,
            colorCount: validColorCount,
          });
        }
      }

      socket.emit('server:invite:sent', { inviteId });
    } catch (err) {
      socket.emit('server:error', { code: 'INVITE_FAILED', message: 'Failed to send invite' });
    }
  });

  // Accept invite -> both enter ready state
  socket.on('client:invite:accept', async ({ inviteId }: { inviteId: string }) => {
    try {
      const data = await redis.hgetall(`invite:${inviteId}`);
      if (!data || !data.fromUserId) {
        socket.emit('server:error', { code: 'INVITE_EXPIRED', message: 'Invite expired' });
        return;
      }

      // Mark accepted, both need to ready up
      await redis.hset(`invite:${inviteId}`, 'status', 'accepted');
      readyStates.set(inviteId, new Set());

      const inviteColorCount = data.colorCount ? parseInt(data.colorCount, 10) : null;
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        const as = s as unknown as AuthenticatedSocket;
        if (as.userId === data.fromUserId || as.userId === socket.userId) {
          s.emit('server:invite:accepted', {
            inviteId,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            turnTimeMs: parseInt(data.turnTimeMs),
            colorCount: inviteColorCount,
          });
        }
      }
    } catch (err) {
      socket.emit('server:error', { code: 'ACCEPT_FAILED', message: 'Failed to accept' });
    }
  });

  // Ready up
  socket.on('client:invite:ready', async ({ inviteId }: { inviteId: string }) => {
    try {
      const data = await redis.hgetall(`invite:${inviteId}`);
      if (!data || data.status !== 'accepted') return;

      let ready = readyStates.get(inviteId);
      if (!ready) { ready = new Set(); readyStates.set(inviteId, ready); }
      ready.add(socket.userId);

      // Notify both about ready state
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        const as = s as unknown as AuthenticatedSocket;
        if (as.userId === data.fromUserId || as.userId === data.toUserId) {
          s.emit('server:invite:player-ready', { inviteId, userId: socket.userId, readyCount: ready.size });
        }
      }

      // Both ready -> create game after 3s countdown
      if (ready.size >= 2) {
        for (const s of sockets) {
          const as = s as unknown as AuthenticatedSocket;
          if (as.userId === data.fromUserId || as.userId === data.toUserId) {
            s.emit('server:invite:starting', { inviteId, countdown: 3 });
          }
        }

        setTimeout(async () => {
          try {
            const turnTimeMs = parseInt(data.turnTimeMs) || 60000;
            const inviteColorCount = data.colorCount ? parseInt(data.colorCount, 10) : null;
            const game = await Game.create({
              type: 'pvp', matchType: 'friendly', status: 'waiting_secrets', turnTimeMs,
              colorCount: inviteColorCount,
              players: {
                host: { userId: data.fromUserId, secret: '', secretSet: false, guesses: [], guessedThisRound: false },
                challenger: { userId: data.toUserId, secret: '', secretSet: false, guesses: [], guessedThisRound: false },
              },
            });

            const gameId = game._id!.toString();

            // Get user info
            const [hostUser, challUser] = await Promise.all([
              User.findById(data.fromUserId).lean(),
              User.findById(data.toUserId).lean(),
            ]);

            for (const s of await io.fetchSockets()) {
              const as = s as unknown as AuthenticatedSocket;
              if (as.userId === data.fromUserId || as.userId === data.toUserId) {
                s.join(`game:${gameId}`);
                s.emit('server:invite:game-created', { inviteId, gameId });
              }
            }

            readyStates.delete(inviteId);
            await redis.del(`invite:${inviteId}`);
          } catch (err) {
            console.error('Create friendly game error:', err);
          }
        }, 3000);
      }
    } catch (err) {
      socket.emit('server:error', { code: 'READY_FAILED', message: 'Failed to ready up' });
    }
  });

  // Decline invite
  socket.on('client:invite:decline', async ({ inviteId }: { inviteId: string }) => {
    try {
      const data = await redis.hgetall(`invite:${inviteId}`);
      if (!data) return;

      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        const as = s as unknown as AuthenticatedSocket;
        if (as.userId === data.fromUserId) {
          s.emit('server:invite:declined', { inviteId });
        }
      }

      await redis.del(`invite:${inviteId}`);
      readyStates.delete(inviteId);
    } catch (err) {
      socket.emit('server:error', { code: 'DECLINE_FAILED', message: 'Failed to decline' });
    }
  });
}
