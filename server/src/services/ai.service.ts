import type { AIDifficulty } from '@bulls-and-cows/shared';
import { AI_THINK_MIN_MS, AI_THINK_MAX_MS } from '@bulls-and-cows/shared';
import { randomSecret } from '../utils/bulls-cows.js';
import { KnuthSolver, SimpleSolver, RandomGuesser } from '../utils/knuth.js';

type Solver = KnuthSolver | SimpleSolver | RandomGuesser;

interface AIState {
  solver: Solver;
  secret: string;
}

const activeGames = new Map<string, AIState>();

function createSolver(difficulty: AIDifficulty): Solver {
  switch (difficulty) {
    case 'hard':
      return new KnuthSolver();
    case 'medium':
      return new SimpleSolver();
    case 'easy':
      return new RandomGuesser();
  }
}

export function initAIGame(gameId: string, difficulty: AIDifficulty): string {
  const secret = randomSecret();
  activeGames.set(gameId, {
    solver: createSolver(difficulty),
    secret,
  });
  return secret;
}

export function getAISecret(gameId: string): string | null {
  return activeGames.get(gameId)?.secret ?? null;
}

export async function getAIGuess(gameId: string): Promise<string | null> {
  const state = activeGames.get(gameId);
  if (!state) return null;

  // Artificial thinking delay
  const delay =
    AI_THINK_MIN_MS + Math.random() * (AI_THINK_MAX_MS - AI_THINK_MIN_MS);
  await new Promise((r) => setTimeout(r, delay));

  return state.solver.nextGuess();
}

export function processAIResult(
  gameId: string,
  guess: string,
  bulls: number,
  cows: number,
): void {
  const state = activeGames.get(gameId);
  if (!state) return;
  state.solver.processResult(guess, bulls, cows);
}

export function cleanupAIGame(gameId: string): void {
  activeGames.delete(gameId);
}
