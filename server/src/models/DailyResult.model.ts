import mongoose, { Schema, type Document, type Types } from 'mongoose';

interface DailyGuess {
  guess: string;
  bulls: number;
  cows: number;
}

export interface IDailyResult extends Document {
  userId: Types.ObjectId;
  dateKey: string;
  guesses: DailyGuess[];
  guessCount: number;
  solved: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const guessSchema = new Schema<DailyGuess>(
  { guess: { type: String, required: true }, bulls: { type: Number, required: true }, cows: { type: Number, required: true } },
  { _id: false },
);

const dailySchema = new Schema<IDailyResult>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateKey: { type: String, required: true },
    guesses: { type: [guessSchema], default: [] },
    guessCount: { type: Number, default: 0 },
    solved: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

dailySchema.index({ userId: 1, dateKey: 1 }, { unique: true }); // one attempt per user per day
dailySchema.index({ dateKey: 1, solved: 1, guessCount: 1 }); // leaderboard

export const DailyResult = mongoose.model<IDailyResult>('DailyResult', dailySchema);
