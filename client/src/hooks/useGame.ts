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
  currentTurn: "host" | "challenger" | null;
  turnDeadline: number | null; // timestamp ms
  opponent: { userId: string; displayName: string; avatarUrl: string } | null;
  result: {
    winnerId: string | null;
    reason: string;
    hostSecret: string;
    challengerSecret: string;
    eloChange: { host: number; challenger: number } | null;
  } | null;
  mySecret: string | null;
  colorCount: number | null;
}

type Action =
  | { type: "GAME_STATE"; payload: Record<string, unknown> }
  | { type: "SECRET_SET"; payload: { role: string }; secret?: string }
  | { type: "GAME_START" }
  | { type: "TURN"; payload: { turn: string; deadline: number } }
  | { type: "GUESS_RESULT"; payload: { role: string; guess: string; bulls: number; cows: number } }
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
  currentTurn: null,
  turnDeadline: null,
  opponent: null,
  result: null,
  mySecret: null,
  colorCount: null,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "GAME_STATE": {
      const p = action.payload;
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
        currentTurn: (p.currentTurn as "host" | "challenger") || null,
        colorCount: (p.colorCount as number | null | undefined) ?? null,
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
      const newMySecretSet = isMe ? true : state.mySecretSet;
      const newOppSecretSet = isMe ? state.opponentSecretSet : true;
      return {
        ...state,
        mySecretSet: newMySecretSet,
        opponentSecretSet: newOppSecretSet,
        mySecret: isMe && action.secret ? action.secret : state.mySecret,
        // Auto-transition when both secrets set (defensive: don't rely solely on server:game:start)
        status: newMySecretSet && newOppSecretSet && state.status === "waiting_secrets"
          ? "in_progress" : state.status,
      };
    }
    case "GAME_START":
      return { ...state, status: "in_progress" };
    case "TURN":
      return {
        ...state,
        currentTurn: action.payload.turn as "host" | "challenger",
        turnDeadline: action.payload.deadline,
      };
    case "GUESS_RESULT": {
      const { role, guess, bulls, cows } = action.payload;
      const isMyGuess = role === state.myRole;
      const entry = { guess, bulls, cows };
      const newRound = role === "challenger" ? state.currentRound + 1 : state.currentRound;
      return {
        ...state,
        myGuesses: isMyGuess ? [...state.myGuesses, entry] : state.myGuesses,
        opponentGuesses: isMyGuess ? state.opponentGuesses : [...state.opponentGuesses, entry],
        currentRound: state.gameId && state.status === "in_progress" ? newRound : state.currentRound,
      };
    }
    case "GAME_OVER":
      return {
        ...state,
        status: "completed",
        currentTurn: null,
        turnDeadline: null,
        result: action.payload as GameState["result"],
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useGame(socket: Socket | null, autoJoinGameId?: string) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!socket) return;

    const handlers: Record<string, (...args: unknown[]) => void> = {
      "server:game:state": (data) => dispatch({ type: "GAME_STATE", payload: data as Record<string, unknown> }),
      "server:game:secret-set": (data) => dispatch({ type: "SECRET_SET", payload: data as { role: string } }),
      "server:game:start": () => dispatch({ type: "GAME_START" }),
      "server:game:turn": (data) => dispatch({ type: "TURN", payload: data as { turn: string; deadline: number } }),
      "server:game:guess-result": (data) => dispatch({ type: "GUESS_RESULT", payload: data as { role: string; guess: string; bulls: number; cows: number } }),
      "server:game:over": (data) => dispatch({ type: "GAME_OVER", payload: data as Record<string, unknown> }),
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }

    if (autoJoinGameId) {
      socket.emit("client:game:join", { gameId: autoJoinGameId });
    }

    return () => {
      for (const event of Object.keys(handlers)) {
        socket.off(event);
      }
    };
  }, [socket, autoJoinGameId]);

  const setSecret = useCallback(
    (secret: string) => {
      if (!state.gameId) return;
      dispatch({ type: "SECRET_SET", payload: { role: state.myRole! }, secret });
      socket?.emit("client:game:set-secret", { gameId: state.gameId, secret });
    },
    [socket, state.gameId, state.myRole],
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

  const isMyTurn = state.currentTurn === state.myRole;

  return { ...state, isMyTurn, setSecret, submitGuess, quitGame, reset };
}
