export interface GuessResult {
  guess: string;
  bulls: number;
  cows: number;
  timestamp: Date;
}

export interface PlayerState {
  userId: string;
  displayName: string;
  avatarUrl: string;
  secretSet: boolean;
  guesses: GuessResult[];
}

export type GameType = 'pvp' | 'ai';
export type MatchType = 'ranked' | 'friendly' | 'ai';
export type GameStatus = 'waiting_secrets' | 'in_progress' | 'completed' | 'abandoned';
export type GameOverReason = 'guessed' | 'opponent_quit' | 'timeout' | 'draw';
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export type PlayerRole = 'host' | 'challenger';

export interface GameState {
  gameId: string;
  type: GameType;
  matchType: MatchType;
  status: GameStatus;
  host: PlayerState;
  challenger: PlayerState;
  currentRound: number;
  myRole: PlayerRole;
}

export interface RoundResult {
  round: number;
  myResult: { guess: string; bulls: number; cows: number };
  opponentResult: { guess: string; bulls: number; cows: number };
}

export interface GameOverResult {
  winnerId: string | null;
  reason: GameOverReason;
  hostSecret: string;
  challengerSecret: string;
  eloChange: { host: number; challenger: number } | null;
  stats: { hostGuesses: number; challengerGuesses: number };
}

export interface EvaluationResult {
  bulls: number;
  cows: number;
}
