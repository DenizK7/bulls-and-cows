import type { AIDifficulty, GameOverResult, GameState, RoundResult } from './game.types.js';
import type { FriendInfo, FriendRequest } from './user.types.js';

// Server -> Client payloads
export interface ServerConnectedPayload {
  userId: string;
  displayName: string;
  onlineFriends: string[];
}

export interface LobbyStatePayload {
  onlineFriends: FriendInfo[];
  pendingInvites: { inviteId: string; from: { userId: string; displayName: string; avatarUrl: string } }[];
  onlineCount: number;
}

export interface MatchmakingQueuedPayload {
  position: number;
  estimatedWait: number;
}

export interface MatchmakingFoundPayload {
  gameId: string;
  opponent: { userId: string; displayName: string; avatarUrl: string; eloRating: number };
}

export interface InviteReceivedPayload {
  inviteId: string;
  from: { userId: string; displayName: string; avatarUrl: string };
}

export interface GameSecretSetPayload {
  role: 'host' | 'challenger';
}

export interface GameStartPayload {
  startedAt: Date;
}

export interface GameOpponentReadyPayload {
  round: number;
}

export interface GameOverPayload extends GameOverResult {}

export interface RematchRequestedPayload {
  userId: string;
}

export interface RematchStartPayload {
  newGameId: string;
}

export interface ServerErrorPayload {
  code: string;
  message: string;
}

// Client -> Server payloads
export interface InviteSendPayload {
  toUserId: string;
}

export interface InviteResponsePayload {
  inviteId: string;
}

export interface GameJoinPayload {
  gameId: string;
}

export interface SetSecretPayload {
  secret: string;
}

export interface GuessPayload {
  guess: string;
}

export interface StartAIPayload {
  difficulty: AIDifficulty;
}
