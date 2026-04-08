"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { useGame } from "@/hooks/useGame";

function DigitInput({
  onSubmit,
  placeholder,
  disabled,
}: {
  onSubmit: (value: string) => void;
  placeholder: string;
  disabled: boolean;
}) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 3) {
      refs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
    if (e.key === "Enter") {
      const code = digits.join("");
      if (code.length === 4 && new Set(digits).size === 4) {
        onSubmit(code);
        setDigits(["", "", "", ""]);
        refs[0].current?.focus();
      }
    }
  };

  const code = digits.join("");
  const isValid = code.length === 4 && new Set(digits).size === 4 && digits.every((d) => d !== "");

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={disabled}
            className="w-14 h-16 bg-bg-elevated border-2 border-border rounded-xl text-center font-mono text-2xl font-bold text-text focus:border-accent focus:outline-none transition-colors disabled:opacity-40"
            placeholder={placeholder[i] || "·"}
          />
        ))}
      </div>
      <button
        onClick={() => {
          if (isValid) {
            onSubmit(code);
            setDigits(["", "", "", ""]);
            refs[0].current?.focus();
          }
        }}
        disabled={disabled || !isValid}
        className="px-6 py-2.5 bg-accent text-bg font-semibold rounded-lg hover:brightness-110 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed text-sm"
      >
        Confirm
      </button>
    </div>
  );
}

function GuessRow({
  guess,
  bulls,
  cows,
  index,
}: {
  guess: string;
  bulls: number;
  cows: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-2"
    >
      <div className="flex gap-1">
        {guess.split("").map((d, i) => (
          <div
            key={i}
            className="w-9 h-10 bg-bg-elevated border border-border rounded-md flex items-center justify-center font-mono text-sm font-bold text-text"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 ml-1">
        {bulls > 0 && (
          <span className="bg-bull/15 text-bull text-xs font-bold px-2 py-0.5 rounded-full">
            {bulls}B
          </span>
        )}
        {cows > 0 && (
          <span className="bg-cow/15 text-cow text-xs font-bold px-2 py-0.5 rounded-full">
            {cows}C
          </span>
        )}
        {bulls === 0 && cows === 0 && (
          <span className="text-text-dim text-xs px-2">miss</span>
        )}
      </div>
    </motion.div>
  );
}

function PlayerPanel({
  label,
  avatarUrl,
  isMe,
  guesses,
  secretSet,
  won,
}: {
  label: string;
  avatarUrl: string;
  isMe: boolean;
  guesses: { guess: string; bulls: number; cows: number }[];
  secretSet: boolean;
  won: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isMe ? "bg-accent/20 text-accent" : "bg-bg-elevated text-text-muted"
          }`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            label[0]?.toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {label} {isMe && <span className="text-accent text-xs">(you)</span>}
          </div>
          <div className="text-xs text-text-dim">
            {won ? "🎉 Won!" : secretSet ? `${guesses.length} guesses` : "Setting secret..."}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-bg-elevated/50 rounded-xl p-3 overflow-y-auto max-h-[400px]">
        {guesses.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-dim text-sm">
            No guesses yet
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {guesses.map((g, i) => (
              <GuessRow key={i} index={i} guess={g.guess} bulls={g.bulls} cows={g.cows} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GamePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;
  const { socket, connected } = useSocket();
  const game = useGame(socket);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (socket && connected && gameId && !game.gameId) {
      game.joinGame(gameId);
    }
  }, [socket, connected, gameId, game]);

  if (!game.gameId || !game.opponent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userId = (session as { userId?: string })?.userId;
  const isWinner = game.result?.winnerId === userId;
  const isDraw = game.result?.reason === "draw";

  return (
    <div className="flex-1 flex flex-col px-4 py-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">
            <span className="text-bull">B</span>
            <span className="text-text-dim">&</span>
            <span className="text-cow">C</span>
          </h1>
          <span className="text-text-dim text-sm">Round {game.currentRound}</span>
        </div>
        <div className="flex items-center gap-2">
          {game.status !== "completed" && (
            <button
              onClick={() => {
                game.quitGame();
                router.push("/lobby");
              }}
              className="text-xs text-text-dim hover:text-danger transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-danger/10"
            >
              Quit
            </button>
          )}
        </div>
      </div>

      {/* Secret Setting Phase */}
      <AnimatePresence>
        {game.status === "waiting_secrets" && !game.mySecretSet && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-bg-card border border-border rounded-2xl p-6 mb-4 text-center"
          >
            <h2 className="text-lg font-semibold mb-1">Choose Your Secret</h2>
            <p className="text-text-muted text-sm mb-4">Pick 4 unique digits for your opponent to guess</p>
            <DigitInput onSubmit={game.setSecret} placeholder="····" disabled={false} />
          </motion.div>
        )}

        {game.status === "waiting_secrets" && game.mySecretSet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-bg-card border border-accent/20 rounded-2xl p-6 mb-4 text-center"
          >
            <div className="text-accent text-lg font-medium mb-1">Secret Set!</div>
            <p className="text-text-muted text-sm">
              {game.opponentSecretSet ? "Starting..." : "Waiting for opponent..."}
            </p>
            {!game.opponentSecretSet && (
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mt-3" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split Screen Game Board */}
      <div className="flex-1 flex gap-4">
        <PlayerPanel
          label={session?.user?.name || "You"}
          avatarUrl={session?.user?.image || ""}
          isMe={true}
          guesses={game.myGuesses}
          secretSet={game.mySecretSet}
          won={isWinner}
        />

        {/* Divider */}
        <div className="w-px bg-border relative flex-shrink-0">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-bg px-1 py-2">
            <span className="text-text-dim text-xs font-mono">VS</span>
          </div>
        </div>

        <PlayerPanel
          label={game.opponent.displayName}
          avatarUrl={game.opponent.avatarUrl}
          isMe={false}
          guesses={game.opponentGuesses}
          secretSet={game.opponentSecretSet}
          won={game.result?.winnerId === game.opponent.userId}
        />
      </div>

      {/* Guess Input */}
      {game.status === "in_progress" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-bg-card border border-border rounded-2xl p-5 text-center"
        >
          <p className="text-text-muted text-sm mb-3">
            {game.opponentReady ? (
              <span className="text-warning">Opponent has guessed — your turn!</span>
            ) : (
              "Enter your guess"
            )}
          </p>
          <DigitInput onSubmit={game.submitGuess} placeholder="····" disabled={false} />
        </motion.div>
      )}

      {/* Game Over */}
      <AnimatePresence>
        {game.status === "completed" && game.result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              className="bg-bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center"
            >
              <div className="text-5xl mb-3">
                {isDraw ? "🤝" : isWinner ? "🎉" : "😔"}
              </div>
              <h2 className="text-2xl font-bold mb-1">
                {isDraw ? "Draw!" : isWinner ? "You Won!" : "You Lost"}
              </h2>
              <p className="text-text-muted text-sm mb-4">
                {game.result.reason === "opponent_quit"
                  ? "Opponent quit the game"
                  : `Finished in round ${game.myGuesses.length}`}
              </p>

              <div className="flex justify-center gap-6 mb-6 text-sm">
                <div>
                  <div className="text-text-dim">Your secret</div>
                  <div className="font-mono font-bold text-lg text-accent">
                    {game.myRole === "host" ? game.result.hostSecret : game.result.challengerSecret}
                  </div>
                </div>
                <div>
                  <div className="text-text-dim">Their secret</div>
                  <div className="font-mono font-bold text-lg text-accent">
                    {game.myRole === "host" ? game.result.challengerSecret : game.result.hostSecret}
                  </div>
                </div>
              </div>

              {game.result.eloChange && (
                <div className={`text-sm font-medium mb-4 ${isWinner ? "text-success" : "text-danger"}`}>
                  ELO {isWinner ? "+" : ""}
                  {game.myRole === "host" ? game.result.eloChange.host : game.result.eloChange.challenger}
                </div>
              )}

              <button
                onClick={() => {
                  game.reset();
                  router.push("/lobby");
                }}
                className="w-full py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 transition-all cursor-pointer active:scale-[0.98]"
              >
                Back to Lobby
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
