import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User, type IUser } from '../models/User.model.js';

export async function upsertUser(profile: {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}): Promise<IUser> {
  const user = await User.findOneAndUpdate(
    { googleId: profile.googleId },
    {
      $set: {
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        lastOnline: new Date(),
      },
      $setOnInsert: {
        displayName: profile.displayName,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return user;
}

export function signJwt(userId: string): string {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: '24h' });
}

export function verifyJwt(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, env.jwtSecret) as { userId: string };
  } catch {
    return null;
  }
}
