import mongoose, { Schema, type Document, type Types } from 'mongoose';

interface GuessEntry {
  guess: string;
  bulls: number;
  cows: number;
  timestamp: Date;
}

interface PlayerData {
  userId: Types.ObjectId | string;
  secret: string;
  secretSet: boolean;
  guesses: GuessEntry[];
  guessedThisRound: boolean;
}

export interface IGame extends Document {
  type: 'pvp' | 'ai';
  matchType: 'ranked' | 'friendly' | 'ai';
  status: 'waiting_secrets' | 'in_progress' | 'completed' | 'abandoned';
  players: {
    host: PlayerData;
    challenger: PlayerData;
  };
  currentRound: number;
  result: {
    winnerId: Types.ObjectId | string | null;
    reason: 'guessed' | 'opponent_quit' | 'timeout' | 'draw';
    hostGuessCount: number;
    challengerGuessCount: number;
    eloChange: { host: number; challenger: number } | null;
  } | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const guessSchema = new Schema<GuessEntry>(
  {
    guess: { type: String, required: true },
    bulls: { type: Number, required: true },
    cows: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const playerSchema = new Schema<PlayerData>(
  {
    userId: { type: Schema.Types.Mixed, required: true },
    secret: { type: String, default: '' },
    secretSet: { type: Boolean, default: false },
    guesses: { type: [guessSchema], default: [] },
    guessedThisRound: { type: Boolean, default: false },
  },
  { _id: false },
);

const gameSchema = new Schema<IGame>(
  {
    type: { type: String, enum: ['pvp', 'ai'], required: true },
    matchType: { type: String, enum: ['ranked', 'friendly', 'ai'], required: true },
    status: {
      type: String,
      enum: ['waiting_secrets', 'in_progress', 'completed', 'abandoned'],
      default: 'waiting_secrets',
    },
    players: {
      host: { type: playerSchema, required: true },
      challenger: { type: playerSchema, required: true },
    },
    currentRound: { type: Number, default: 1 },
    result: { type: Schema.Types.Mixed, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

gameSchema.index({ 'players.host.userId': 1, createdAt: -1 });
gameSchema.index({ 'players.challenger.userId': 1, createdAt: -1 });
gameSchema.index({ status: 1 });

export const Game = mongoose.model<IGame>('Game', gameSchema);
