"use client";

import { useCallback, useEffect, useReducer } from "react";
import type { Socket } from "socket.io-client";

interface GuessResult {
  guess: string;
  bulls: number;
  cows: number;
}

interface GameState {
  gameId: string | null;
  status: "idle" | "waiting_secrets" | "in_progress" | "completed";
  myRole: "host" | "challenger" | null;
  mySecretSet: boolean;
  opponentSecretSet: boolean;
  myGuesses: GuessResult[];
  opponentGuesses: GuessResult[];
  currentRound: number;
  opponent: { userId: string; displayName: string; avatarUrl: string } | null;
  result: {
    winnerId: string | null;
    reason: string;
    hostSecret: string;
    challengerSecret: string;
    eloChange: { host: number; challenger: number } | null;
  } | null;
  opponentReady: boolean;
}

type Action =
  | { type: "GAME_STATE"; payload: Record<string, unknown> }
  | { type: "SECRET_SET"; payload: { role: string } }
  | { type: "GAME_START" }
  | { type: "OPPONENT_READY" }
  | { type: "ROUND_RESULT"; payload: { myResult: GuessResult; opponentResult: GuessResult; round: number } }
  | { type: "GAME_OVER"; payload: Record<string, unknown> }
  | { type: "RESET" };

const initialState: GameState = {
  gameId: null,
  status: "idle",
  myRole: null,
  mySecretSet: false,
  opponentSecretSet: false,
  myGuesses: [],
  opponentGuesses: [],
  currentRound: 1,
  opponent: null,
  result: null,
  opponentReady: false,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "GAME_STATE": {
      const p = action.payload as Record<string, unknown>;
      const myRole = p.myRole as string;
      const host = p.host as Record<string, unknown>;
      const challenger = p.challenger as Record<string, unknown>;
      const me = myRole === "host" ? host : challenger;
      const opp = myRole === "host" ? challenger : host;
      return {
        ...state,
        gameId: p.gameId as string,
        status: p.status as GameState["status"],
        myRole: myRole as "host" | "challenger",
        mySecretSet: me.secretSet as boolean,
        opponentSecretSet: opp.secretSet as boolean,
        myGuesses: (me.guesses as GuessResult[]) || [],
        opponentGuesses: (opp.guesses as GuessResult[]) || [],
        currentRound: (p.currentRound as number) || 1,
        opponent: {
          userId: opp.userId as string,
          displayName: opp.displayName as string,
          avatarUrl: opp.avatarUrl as string,
        },
      };
    }
    case "SECRET_SET": {
      const role = action.payload.role;
      const isMe = role === state.myRole;
      return {
        ...state,
        mySecretSet: isMe ? true : state.mySecretSet,
        opponentSecretSet: isMe ? state.opponentSecretSet : true,
      };
    }
    case "GAME_START":
      return { ...state, status: "in_progress" };
    case "OPPONENT_READY":
      return { ...state, opponentReady: true };
    case "ROUND_RESULT":
      return {
        ...state,
        myGuesses: [...state.myGuesses, action.payload.myResult],
        opponentGuesses: [...state.opponentGuesses, action.payload.opponentResult],
        currentRound: action.payload.round + 1,
        opponentReady: false,
      };
    case "GAME_OVER":
      return {
        ...state,
        status: "completed",
        result: action.payload as GameState["result"],
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useGame(socket: Socket | null) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!socket) return;

    const handlers = {
      "server:game:state": (data: Record<string, unknown>) => dispatch({ type: "GAME_STATE", payload: data }),
      "server:game:secret-set": (data: { role: string }) => dispatch({ type: "SECRET_SET", payload: data }),
      "server:game:start": () => dispatch({ type: "GAME_START" }),
      "server:game:opponent-ready": () => dispatch({ type: "OPPONENT_READY" }),
      "server:game:round-result": (data: { myResult: GuessResult; opponentResult: GuessResult; round: number }) =>
        dispatch({ type: "ROUND_RESULT", payload: data }),
      "server:game:over": (data: Record<string, unknown>) => dispatch({ type: "GAME_OVER", payload: data }),
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }

    return () => {
      for (const event of Object.keys(handlers)) {
        socket.off(event);
      }
    };
  }, [socket]);

  const startAI = useCallback(
    (difficulty: string) => {
      socket?.emit("client:game:start-ai", { difficulty });
    },
    [socket],
  );

  const joinGame = useCallback(
    (gameId: string) => {
      socket?.emit("client:game:join", { gameId });
    },
    [socket],
  );

  const setSecret = useCallback(
    (secret: string) => {
      if (!state.gameId) return;
      socket?.emit("client:game:set-secret", { gameId: state.gameId, secret });
    },
    [socket, state.gameId],
  );

  const submitGuess = useCallback(
    (guess: string) => {
      if (!state.gameId) return;
      socket?.emit("client:game:guess", { gameId: state.gameId, guess });
    },
    [socket, state.gameId],
  );

  const quitGame = useCallback(() => {
    if (!state.gameId) return;
    socket?.emit("client:game:quit", { gameId: state.gameId });
  }, [socket, state.gameId]);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    ...state,
    startAI,
    joinGame,
    setSecret,
    submitGuess,
    quitGame,
    reset,
  };
}
