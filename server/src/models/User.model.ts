import mongoose, { Schema, type Document } from 'mongoose';
import { STARTING_ELO } from '@bulls-and-cows/shared';

export interface IUser extends Document {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
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
    avatarUrl: { type: String, default: '' },
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

export const User = mongoose.model<IUser>('User', userSchema);
