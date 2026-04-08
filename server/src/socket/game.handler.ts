import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from './index.js';
import type { AIDifficulty } from '@bulls-and-cows/shared';
import { isValidSecret, isValidGuess, ELO_K_FACTOR } from '@bulls-and-cows/shared';
import { Game, type IGame } from '../models/Game.model.js';
import { User } from '../models/User.model.js';
import { evaluate } from '../utils/bulls-cows.js';
import { initAIGame, getAIGuess, processAIResult, getAISecret, cleanupAIGame } from '../services/ai.service.js';

const TURN_TIME_MS = 60_000; // 60 seconds per turn
const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

function gameRoom(id: string) { return `game:${id}`; }

function clearTurnTimer(gameId: string) {
  const t = turnTimers.get(gameId);
  if (t) { clearTimeout(t); turnTimers.delete(gameId); }
}

function startTurnTimer(io: Server, gameId: string, currentTurn: 'host' | 'challenger') {
  clearTurnTimer(gameId);

  // Tell everyone the turn started with deadline
  const deadline = Date.now() + TURN_TIME_MS;
  io.to(gameRoom(gameId)).emit('server:game:turn', { turn: currentTurn, deadline });

  const timer = setTimeout(async () => {
    turnTimers.delete(gameId);
    try {
      const game = await Game.findById(gameId);
      if (!game || game.status !== 'in_progress') return;

      // The player whose turn it is loses by timeout
      const loserId = currentTurn === 'host'
        ? game.players.host.userId.toString()
        : game.players.challenger.userId.toString();
      const winnerId = currentTurn === 'host'
        ? game.players.challenger.userId.toString()
        : game.players.host.userId.toString();

      await endGame(io, game, winnerId === 'AI' ? null : winnerId, 'timeout');
    } catch (err) {
      console.error('Turn timeout error:', err);
    }
  }, TURN_TIME_MS);

  turnTimers.set(gameId, timer);
}

function calculateElo(winnerRating: number, loserRating: number) {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const delta = Math.round(ELO_K_FACTOR * (1 - expected));
  return { winnerDelta: delta, loserDelta: -delta };
}

async function endGame(io: Server, game: IGame, winnerId: string | null, reason: string) {
  const gameId = game._id!.toString();
  clearTurnTimer(gameId);

  let eloChange = null;
  if (game.type === 'pvp' && game.matchType === 'ranked' && winnerId && reason === 'guessed') {
    const hostUser = await User.findById(game.players.host.userId);
    const challUser = await User.findById(game.players.challenger.userId);
    if (hostUser && challUser) {
      const isHostWinner = winnerId === game.players.host.userId.toString();
      const { winnerDelta, loserDelta } = calculateElo(
        isHostWinner ? hostUser.stats.eloRating : challUser.stats.eloRating,
        isHostWinner ? challUser.stats.eloRating : hostUser.stats.eloRating,
      );
      eloChange = { host: isHostWinner ? winnerDelta : loserDelta, challenger: isHostWinner ? loserDelta : winnerDelta };
      for (const [user, delta, won] of [
        [hostUser, eloChange.host, winnerId === hostUser._id!.toString()] as const,
        [challUser, eloChange.challenger, winnerId === challUser._id!.toString()] as const,
      ]) {
        user.stats.gamesPlayed++;
        if (won) { user.stats.gamesWon++; user.stats.currentStreak++; user.stats.longestStreak = Math.max(user.stats.longestStreak, user.stats.currentStreak); }
        else { user.stats.gamesLost++; user.stats.currentStreak = 0; }
        user.stats.eloRating += delta;
        await user.save();
      }
    }
  }

  game.status = 'completed';
  game.completedAt = new Date();
  game.result = {
    winnerId,
    reason: reason as 'guessed' | 'opponent_quit' | 'timeout' | 'draw',
    hostGuessCount: game.players.host.guesses.length,
    challengerGuessCount: game.players.challenger.guesses.length,
    eloChange,
  };
  await game.save();
  if (game.type === 'ai') cleanupAIGame(gameId);

  io.to(gameRoom(gameId)).emit('server:game:over', {
    winnerId,
    reason,
    hostSecret: game.players.host.secret,
    challengerSecret: game.players.challenger.secret,
    eloChange,
    stats: { hostGuesses: game.players.host.guesses.length, challengerGuesses: game.players.challenger.guesses.length },
  });
}

export function handleGameEvents(io: Server, socket: AuthenticatedSocket): void {
  // Start AI game
  socket.on('client:game:start-ai', async ({ difficulty }: { difficulty: AIDifficulty }) => {
    try {
      const aiSecret = initAIGame('pending', difficulty);
      const game = await Game.create({
        type: 'ai', matchType: 'ai', status: 'waiting_secrets',
        players: {
          host: { userId: socket.userId, secret: '', secretSet: false, guesses: [], guessedThisRound: false },
          challenger: { userId: 'AI', secret: aiSecret, secretSet: true, guesses: [], guessedThisRound: false },
        },
      });
      const gameId = game._id!.toString();
      cleanupAIGame('pending');
      initAIGame(gameId, difficulty);
      game.players.challenger.secret = getAISecret(gameId)!;
      await game.save();

      socket.join(gameRoom(gameId));
      socket.emit('server:game:state', buildGameState(game, socket.userId, socket.displayName, socket.avatarUrl, `AI (${difficulty})`));
    } catch (err) {
      socket.emit('server:error', { code: 'GAME_CREATE_FAILED', message: 'Failed to create game' });
    }
  });

  // Join game room
  socket.on('client:game:join', async ({ gameId }: { gameId: string }) => {
    try {
      const game = await Game.findById(gameId);
      if (!game) { socket.emit('server:error', { code: 'GAME_NOT_FOUND', message: 'Game not found' }); return; }

      socket.join(gameRoom(gameId));
      const isHost = game.players.host.userId.toString() === socket.userId;
      let opponentName = 'AI';
      let opponentAvatar = '';
      const opponentId = isHost ? game.players.challenger.userId.toString() : game.players.host.userId.toString();
      if (opponentId !== 'AI') {
        const u = await User.findById(opponentId).lean();
        if (u) { opponentName = u.displayName; opponentAvatar = u.avatarUrl; }
      }
      socket.emit('server:game:state', buildGameState(game, socket.userId, socket.displayName, socket.avatarUrl, opponentName, opponentAvatar));
    } catch (err) {
      socket.emit('server:error', { code: 'GAME_JOIN_FAILED', message: 'Failed to join game' });
    }
  });

  // Set secret
  socket.on('client:game:set-secret', async ({ gameId, secret }: { gameId: string; secret: string }) => {
    try {
      if (!isValidSecret(secret)) { socket.emit('server:error', { code: 'INVALID_SECRET', message: 'Must be 4 unique digits' }); return; }
      const game = await Game.findById(gameId);
      if (!game || game.status !== 'waiting_secrets') return;

      const isHost = game.players.host.userId.toString() === socket.userId;
      const player = isHost ? game.players.host : game.players.challenger;
      if (player.secretSet) return;

      player.secret = secret;
      player.secretSet = true;
      const bothSet = game.players.host.secretSet && game.players.challenger.secretSet;
      if (bothSet) { game.status = 'in_progress'; game.startedAt = new Date(); }
      await game.save();

      io.to(gameRoom(gameId)).emit('server:game:secret-set', { role: isHost ? 'host' : 'challenger' });

      if (bothSet) {
        io.to(gameRoom(gameId)).emit('server:game:start', { startedAt: game.startedAt });
        // Host goes first - only use timer for PvP games
        if (game.type === 'pvp') {
          startTurnTimer(io, gameId, 'host');
        } else {
          io.to(gameRoom(gameId)).emit('server:game:turn', { turn: 'host', deadline: null });
        }
      }
    } catch (err) {
      socket.emit('server:error', { code: 'SET_SECRET_FAILED', message: 'Failed to set secret' });
    }
  });

  // Submit guess - TURN BASED
  socket.on('client:game:guess', async ({ gameId, guess }: { gameId: string; guess: string }) => {
    try {
      if (!guess || guess.length !== 4 || !/^\d{4}$/.test(guess)) { socket.emit('server:error', { code: 'INVALID_GUESS', message: 'Must be 4 digits' }); return; }
      const game = await Game.findById(gameId);
      if (!game || game.status !== 'in_progress') return;

      const isHost = game.players.host.userId.toString() === socket.userId;
      const currentTurn = game.currentRound % 2 === 1 ? 'host' : 'challenger';

      // AI games: always host's turn (AI responds immediately)
      if (game.type !== 'ai') {
        const myRole = isHost ? 'host' : 'challenger';
        if (myRole !== currentTurn) { socket.emit('server:error', { code: 'NOT_YOUR_TURN', message: 'Not your turn' }); return; }
      }

      clearTurnTimer(gameId);

      const me = isHost ? game.players.host : game.players.challenger;
      const opponent = isHost ? game.players.challenger : game.players.host;

      // Evaluate my guess
      const result = evaluate(guess, opponent.secret);
      me.guesses.push({ guess, bulls: result.bulls, cows: result.cows, timestamp: new Date() });

      // Broadcast my guess result to all
      io.to(gameRoom(gameId)).emit('server:game:guess-result', {
        role: isHost ? 'host' : 'challenger',
        guess, bulls: result.bulls, cows: result.cows,
      });

      // Check if I won
      if (result.bulls === 4) {
        await game.save();
        await endGame(io, game, me.userId.toString(), 'guessed');
        return;
      }

      // For AI games: AI guesses immediately after host
      if (game.type === 'ai') {
        const aiGuess = await getAIGuess(gameId);
        if (aiGuess) {
          const aiResult = evaluate(aiGuess, me.secret);
          opponent.guesses.push({ guess: aiGuess, bulls: aiResult.bulls, cows: aiResult.cows, timestamp: new Date() });
          processAIResult(gameId, aiGuess, aiResult.bulls, aiResult.cows);

          io.to(gameRoom(gameId)).emit('server:game:guess-result', {
            role: 'challenger',
            guess: aiGuess, bulls: aiResult.bulls, cows: aiResult.cows,
          });

          if (aiResult.bulls === 4) {
            await game.save();
            await endGame(io, game, 'AI', 'guessed');
            return;
          }
        }

        // Next round, host's turn again
        game.currentRound++;
        await game.save();
        io.to(gameRoom(gameId)).emit('server:game:turn', { turn: 'host', deadline: null });
        return;
      }

      // PvP: switch turn
      const nextTurn = currentTurn === 'host' ? 'challenger' : 'host';
      if (nextTurn === 'host') game.currentRound++; // new round when host's turn comes back
      await game.save();
      startTurnTimer(io, gameId, nextTurn);
    } catch (err) {
      console.error('Guess error:', err);
      socket.emit('server:error', { code: 'GUESS_FAILED', message: 'Failed to process guess' });
    }
  });

  // Quit game
  socket.on('client:game:quit', async ({ gameId }: { gameId: string }) => {
    try {
      const game = await Game.findById(gameId);
      if (!game || game.status === 'completed' || game.status === 'abandoned') return;

      const isHost = game.players.host.userId.toString() === socket.userId;
      const winnerId = isHost ? game.players.challenger.userId.toString() : game.players.host.userId.toString();
      await endGame(io, game, winnerId === 'AI' ? null : winnerId, 'opponent_quit');
    } catch (err) {
      socket.emit('server:error', { code: 'QUIT_FAILED', message: 'Failed to quit game' });
    }
  });
}

function buildGameState(game: IGame, myUserId: string, myName: string, myAvatar: string, oppName: string, oppAvatar: string = '') {
  const isHost = game.players.host.userId.toString() === myUserId;
  const currentTurn = game.currentRound % 2 === 1 ? 'host' : 'challenger';
  return {
    gameId: game._id!.toString(),
    type: game.type,
    matchType: game.matchType,
    status: game.status,
    host: {
      userId: game.players.host.userId.toString(),
      displayName: isHost ? myName : oppName,
      avatarUrl: isHost ? myAvatar : oppAvatar,
      secretSet: game.players.host.secretSet,
      guesses: game.players.host.guesses,
    },
    challenger: {
      userId: game.players.challenger.userId.toString(),
      displayName: isHost ? oppName : myName,
      avatarUrl: isHost ? oppAvatar : myAvatar,
      secretSet: game.players.challenger.secretSet,
      guesses: game.players.challenger.guesses,
    },
    currentRound: game.currentRound,
    currentTurn,
    myRole: isHost ? 'host' : 'challenger',
  };
}

export { clearTurnTimer };
