import mongoose, { Schema, type Document } from 'mongoose';
import { STARTING_ELO } from '@bulls-and-cows/shared';

export interface IUser extends Document {
  googleId: string;
  email: string;
  displayName: string;
  tag: string;
  avatarUrl: string;
  setupComplete: boolean;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesDraw: number;
    totalGuesses: number;
    bestGame: number | null;
    currentStreak: number;
    longestStreak: number;
    eloRating: number;
  };
  settings: {
    soundEnabled: boolean;
    theme: 'light' | 'dark';
  };
  lastOnline: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    tag: { type: String, required: true, default: () => String(Math.floor(1000 + Math.random() * 9000)) },
    avatarUrl: { type: String, default: '' },
    setupComplete: { type: Boolean, default: false },
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      gamesLost: { type: Number, default: 0 },
      gamesDraw: { type: Number, default: 0 },
      totalGuesses: { type: Number, default: 0 },
      bestGame: { type: Number, default: null },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      eloRating: { type: Number, default: STARTING_ELO },
    },
    settings: {
      soundEnabled: { type: Boolean, default: true },
      theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
    },
    lastOnline: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userSchema.index({ 'stats.eloRating': -1 });
userSchema.index({ displayName: 'text' });
userSchema.index({ displayName: 1, tag: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', userSchema);
