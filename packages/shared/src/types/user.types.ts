export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  totalGuesses: number;
  bestGame: number | null;
  currentStreak: number;
  longestStreak: number;
  eloRating: number;
}

export interface UserProfile {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  stats: UserStats;
  settings: UserSettings;
  lastOnline: Date;
  createdAt: Date;
}

export interface UserSettings {
  soundEnabled: boolean;
  theme: 'light' | 'dark';
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendInfo {
  userId: string;
  displayName: string;
  avatarUrl: string;
  online: boolean;
  inGame: boolean;
}

export interface FriendRequest {
  id: string;
  from: { userId: string; displayName: string; avatarUrl: string };
  createdAt: Date;
}
