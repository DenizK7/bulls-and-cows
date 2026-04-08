import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from './index.js';
import type { AIDifficulty } from '@bulls-and-cows/shared';
import { isValidSecret, isValidGuess } from '@bulls-and-cows/shared';
import { Game } from '../models/Game.model.js';
import { User } from '../models/User.model.js';
import { evaluate, randomSecret } from '../utils/bulls-cows.js';
import { initAIGame, getAIGuess, processAIResult, getAISecret, cleanupAIGame } from '../services/ai.service.js';
import { ELO_K_FACTOR } from '@bulls-and-cows/shared';

function gameRoom(gameId: string) {
  return `game:${gameId}`;
}

function calculateElo(winnerRating: number, loserRating: number): { winnerDelta: number; loserDelta: number } {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const delta = Math.round(ELO_K_FACTOR * (1 - expected));
  return { winnerDelta: delta, loserDelta: -delta };
}

export function handleGameEvents(io: Server, socket: AuthenticatedSocket): void {
  // Start AI game
  socket.on('client:game:start-ai', async ({ difficulty }: { difficulty: AIDifficulty }) => {
    try {
      const aiSecret = initAIGame('pending', difficulty);

      const game = await Game.create({
        type: 'ai',
        matchType: 'ai',
        status: 'waiting_secrets',
        players: {
          host: { userId: socket.userId, secret: '', secretSet: false, guesses: [], guessedThisRound: false },
          challenger: { userId: 'AI', secret: aiSecret, secretSet: true, guesses: [], guessedThisRound: false },
        },
      });

      const gameId = game._id!.toString();
      // Re-init AI with correct gameId
      cleanupAIGame('pending');
      initAIGame(gameId, difficulty);
      game.players.challenger.secret = getAISecret(gameId)!;
      await game.save();

      socket.join(gameRoom(gameId));

      socket.emit('server:game:state', {
        gameId,
        type: 'ai',
        matchType: 'ai',
        status: 'waiting_secrets',
        host: {
          userId: socket.userId,
          displayName: socket.displayName,
          avatarUrl: socket.avatarUrl,
          secretSet: false,
          guesses: [],
        },
        challenger: {
          userId: 'AI',
          displayName: `AI (${difficulty})`,
          avatarUrl: '',
          secretSet: true,
          guesses: [],
        },
        currentRound: 1,
        myRole: 'host',
      });
    } catch (err) {
      socket.emit('server:error', { code: 'GAME_CREATE_FAILED', message: 'Failed to create game' });
    }
  });

  // Join game room
  socket.on('client:game:join', async ({ gameId }: { gameId: string }) => {
    try {
      const game = await Game.findById(gameId);
      if (!game) {
        socket.emit('server:error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
        return;
      }

      socket.join(gameRoom(gameId));

      const isHost = game.players.host.userId.toString() === socket.userId;
      const myRole = isHost ? 'host' : 'challenger';
      const opponent = isHost ? game.players.challenger : game.players.host;
      const me = isHost ? game.players.host : game.players.challenger;

      // Get opponent display info
      let opponentInfo = { userId: 'AI', displayName: 'AI', avatarUrl: '' };
      if (opponent.userId.toString() !== 'AI') {
        const opponentUser = await User.findById(opponent.userId).lean();
        if (opponentUser) {
          opponentInfo = { userId: opponentUser._id!.toString(), displayName: opponentUser.displayName, avatarUrl: opponentUser.avatarUrl };
        }
      }

      socket.emit('server:game:state', {
        gameId,
        type: game.type,
        matchType: game.matchType,
        status: game.status,
        host: {
          userId: game.players.host.userId.toString(),
          displayName: isHost ? socket.displayName : opponentInfo.displayName,
          avatarUrl: isHost ? socket.avatarUrl : opponentInfo.avatarUrl,
          secretSet: game.players.host.secretSet,
          guesses: game.players.host.guesses,
        },
        challenger: {
          userId: game.players.challenger.userId.toString(),
          displayName: isHost ? opponentInfo.displayName : socket.displayName,
          avatarUrl: isHost ? opponentInfo.avatarUrl : socket.avatarUrl,
          secretSet: game.players.challenger.secretSet,
          guesses: game.players.challenger.guesses,
        },
        currentRound: game.currentRound,
        myRole,
      });
    } catch (err) {
      socket.emit('server:error', { code: 'GAME_JOIN_FAILED', message: 'Failed to join game' });
    }
  });

  // Set secret
  socket.on('client:game:set-secret', async ({ gameId, secret }: { gameId: string; secret: string }) => {
    try {
      if (!isValidSecret(secret)) {
        socket.emit('server:error', { code: 'INVALID_SECRET', message: 'Must be 4 unique digits' });
        return;
      }

      const game = await Game.findById(gameId);
      if (!game || game.status !== 'waiting_secrets') return;

      const isHost = game.players.host.userId.toString() === socket.userId;
      const player = isHost ? game.players.host : game.players.challenger;

      if (player.secretSet) return;

      player.secret = secret;
      player.secretSet = true;

      const bothSet = game.players.host.secretSet && game.players.challenger.secretSet;
      if (bothSet) {
        game.status = 'in_progress';
        game.startedAt = new Date();
      }

      await game.save();

      io.to(gameRoom(gameId)).emit('server:game:secret-set', { role: isHost ? 'host' : 'challenger' });

      if (bothSet) {
        io.to(gameRoom(gameId)).emit('server:game:start', { startedAt: game.startedAt });
      }
    } catch (err) {
      socket.emit('server:error', { code: 'SET_SECRET_FAILED', message: 'Failed to set secret' });
    }
  });

  // Submit guess
  socket.on('client:game:guess', async ({ gameId, guess }: { gameId: string; guess: string }) => {
    try {
      if (!isValidGuess(guess)) {
        socket.emit('server:error', { code: 'INVALID_GUESS', message: 'Must be 4 unique digits' });
        return;
      }

      const game = await Game.findById(gameId);
      if (!game || game.status !== 'in_progress') return;

      const isHost = game.players.host.userId.toString() === socket.userId;
      const me = isHost ? game.players.host : game.players.challenger;
      const opponent = isHost ? game.players.challenger : game.players.host;

      if (me.guessedThisRound) {
        socket.emit('server:error', { code: 'ALREADY_GUESSED', message: 'Already guessed this round' });
        return;
      }

      // Evaluate guess against opponent's secret
      const result = evaluate(guess, opponent.secret);
      me.guesses.push({ guess, bulls: result.bulls, cows: result.cows, timestamp: new Date() });
      me.guessedThisRound = true;

      await game.save();

      // For AI games, immediately generate AI guess
      if (game.type === 'ai' && isHost) {
        const aiGuess = await getAIGuess(gameId);
        if (aiGuess) {
          const aiResult = evaluate(aiGuess, me.secret);
          opponent.guesses.push({ guess: aiGuess, bulls: aiResult.bulls, cows: aiResult.cows, timestamp: new Date() });
          opponent.guessedThisRound = true;

          // Tell AI solver about its result
          processAIResult(gameId, aiGuess, aiResult.bulls, aiResult.cows);

          await game.save();
        }
      }

      // Check if both guessed
      if (me.guessedThisRound && opponent.guessedThisRound) {
        const myLastGuess = me.guesses[me.guesses.length - 1];
        const opponentLastGuess = opponent.guesses[opponent.guesses.length - 1];

        // Emit round result
        const hostGuess = isHost ? myLastGuess : opponentLastGuess;
        const challGuess = isHost ? opponentLastGuess : myLastGuess;

        // Send personalized results to each player
        for (const sid of await io.in(gameRoom(gameId)).fetchSockets()) {
          const s = sid as unknown as AuthenticatedSocket;
          const isThisHost = game.players.host.userId.toString() === (s.userId || socket.userId);

          sid.emit('server:game:round-result', {
            round: game.currentRound,
            myResult: isThisHost
              ? { guess: hostGuess.guess, bulls: hostGuess.bulls, cows: hostGuess.cows }
              : { guess: challGuess.guess, bulls: challGuess.bulls, cows: challGuess.cows },
            opponentResult: isThisHost
              ? { guess: challGuess.guess, bulls: challGuess.bulls, cows: challGuess.cows }
              : { guess: hostGuess.guess, bulls: hostGuess.bulls, cows: hostGuess.cows },
          });
        }

        // Check win conditions
        const hostWon = hostGuess.bulls === 4;
        const challWon = challGuess.bulls === 4;

        if (hostWon || challWon) {
          let winnerId: string | null = null;
          let reason: 'guessed' | 'draw' = 'guessed';

          if (hostWon && challWon) {
            reason = 'draw';
          } else if (hostWon) {
            winnerId = game.players.host.userId.toString();
          } else {
            winnerId = game.players.challenger.userId.toString();
          }

          // Calculate ELO for PvP
          let eloChange = null;
          if (game.type === 'pvp' && game.matchType === 'ranked' && winnerId) {
            const hostUser = await User.findById(game.players.host.userId);
            const challUser = await User.findById(game.players.challenger.userId);
            if (hostUser && challUser) {
              const isHostWinner = winnerId === game.players.host.userId.toString();
              const { winnerDelta, loserDelta } = calculateElo(
                isHostWinner ? hostUser.stats.eloRating : challUser.stats.eloRating,
                isHostWinner ? challUser.stats.eloRating : hostUser.stats.eloRating,
              );
              eloChange = {
                host: isHostWinner ? winnerDelta : loserDelta,
                challenger: isHostWinner ? loserDelta : winnerDelta,
              };

              // Update user stats
              for (const [user, delta, isWinner] of [
                [hostUser, eloChange.host, winnerId === hostUser._id!.toString()] as const,
                [challUser, eloChange.challenger, winnerId === challUser._id!.toString()] as const,
              ]) {
                user.stats.gamesPlayed++;
                user.stats.totalGuesses += (isWinner ? (isHost ? me : opponent) : (isHost ? opponent : me)).guesses.length;
                if (reason === 'draw') {
                  user.stats.gamesDraw++;
                  user.stats.currentStreak = 0;
                } else if (isWinner) {
                  user.stats.gamesWon++;
                  user.stats.currentStreak++;
                  user.stats.longestStreak = Math.max(user.stats.longestStreak, user.stats.currentStreak);
                } else {
                  user.stats.gamesLost++;
                  user.stats.currentStreak = 0;
                }
                user.stats.eloRating += delta;
                await user.save();
              }
            }
          }

          game.status = 'completed';
          game.completedAt = new Date();
          game.result = {
            winnerId,
            reason,
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
            stats: {
              hostGuesses: game.players.host.guesses.length,
              challengerGuesses: game.players.challenger.guesses.length,
            },
          });
        } else {
          // Next round
          game.currentRound++;
          game.players.host.guessedThisRound = false;
          game.players.challenger.guessedThisRound = false;
          await game.save();
        }
      } else {
        // Notify opponent that this player is ready
        socket.to(gameRoom(gameId)).emit('server:game:opponent-ready', { round: game.currentRound });
      }
    } catch (err) {
      console.error('Guess error:', err);
      socket.emit('server:error', { code: 'GUESS_FAILED', message: 'Failed to process guess' });
    }
  });

  // Quit game
  socket.on('client:game:quit', async ({ gameId }: { gameId: string }) => {
    try {
      const game = await Game.findById(gameId);
      if (!game || game.status === 'completed') return;

      const isHost = game.players.host.userId.toString() === socket.userId;
      const winnerId = isHost ? game.players.challenger.userId.toString() : game.players.host.userId.toString();

      game.status = 'completed';
      game.completedAt = new Date();
      game.result = {
        winnerId: winnerId === 'AI' ? null : winnerId,
        reason: 'opponent_quit',
        hostGuessCount: game.players.host.guesses.length,
        challengerGuessCount: game.players.challenger.guesses.length,
        eloChange: null,
      };
      await game.save();

      if (game.type === 'ai') cleanupAIGame(gameId);

      io.to(gameRoom(gameId)).emit('server:game:over', {
        winnerId: game.result.winnerId,
        reason: 'opponent_quit',
        hostSecret: game.players.host.secret,
        challengerSecret: game.players.challenger.secret,
        eloChange: null,
        stats: {
          hostGuesses: game.players.host.guesses.length,
          challengerGuesses: game.players.challenger.guesses.length,
        },
      });
    } catch (err) {
      socket.emit('server:error', { code: 'QUIT_FAILED', message: 'Failed to quit game' });
    }
  });
}
