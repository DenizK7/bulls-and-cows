// Connection
export const SERVER_CONNECTED = 'server:connected' as const;

// Lobby
export const CLIENT_LOBBY_JOIN = 'client:lobby:join' as const;
export const SERVER_LOBBY_STATE = 'server:lobby:state' as const;
export const SERVER_FRIEND_ONLINE = 'server:friend:online' as const;
export const SERVER_FRIEND_OFFLINE = 'server:friend:offline' as const;
export const SERVER_FRIEND_STATUS = 'server:friend:status' as const;

// Matchmaking
export const CLIENT_MATCHMAKING_JOIN = 'client:matchmaking:join' as const;
export const CLIENT_MATCHMAKING_LEAVE = 'client:matchmaking:leave' as const;
export const SERVER_MATCHMAKING_QUEUED = 'server:matchmaking:queued' as const;
export const SERVER_MATCHMAKING_UPDATE = 'server:matchmaking:update' as const;
export const SERVER_MATCHMAKING_FOUND = 'server:matchmaking:found' as const;
export const SERVER_MATCHMAKING_LEFT = 'server:matchmaking:left' as const;

// Invites
export const CLIENT_INVITE_SEND = 'client:invite:send' as const;
export const CLIENT_INVITE_ACCEPT = 'client:invite:accept' as const;
export const CLIENT_INVITE_DECLINE = 'client:invite:decline' as const;
export const SERVER_INVITE_SENT = 'server:invite:sent' as const;
export const SERVER_INVITE_RECEIVED = 'server:invite:received' as const;
export const SERVER_INVITE_ACCEPTED = 'server:invite:accepted' as const;
export const SERVER_INVITE_DECLINED = 'server:invite:declined' as const;
export const SERVER_INVITE_EXPIRED = 'server:invite:expired' as const;

// Game
export const CLIENT_GAME_JOIN = 'client:game:join' as const;
export const CLIENT_GAME_SET_SECRET = 'client:game:set-secret' as const;
export const CLIENT_GAME_GUESS = 'client:game:guess' as const;
export const CLIENT_GAME_QUIT = 'client:game:quit' as const;
export const CLIENT_GAME_REMATCH = 'client:game:rematch' as const;
export const CLIENT_GAME_REMATCH_ACCEPT = 'client:game:rematch-accept' as const;
export const CLIENT_GAME_START_AI = 'client:game:start-ai' as const;

export const SERVER_GAME_STATE = 'server:game:state' as const;
export const SERVER_GAME_SECRET_SET = 'server:game:secret-set' as const;
export const SERVER_GAME_START = 'server:game:start' as const;
export const SERVER_GAME_OPPONENT_READY = 'server:game:opponent-ready' as const;
export const SERVER_GAME_ROUND_RESULT = 'server:game:round-result' as const;
export const SERVER_GAME_OVER = 'server:game:over' as const;
export const SERVER_GAME_REMATCH_REQUESTED = 'server:game:rematch-requested' as const;
export const SERVER_GAME_REMATCH_START = 'server:game:rematch-start' as const;

// Errors
export const SERVER_ERROR = 'server:error' as const;
