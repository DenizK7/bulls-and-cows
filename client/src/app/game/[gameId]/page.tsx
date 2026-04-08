"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { useGame } from "@/hooks/useGame";

function TurnTimer({ deadline, isMyTurn }: { deadline: number | null; isMyTurn: boolean }) {
  const [remaining, setRemaining] = useState(60);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return null;

  const pct = remaining / 60;
  const color =
    pct > 0.5 ? "text-success" : pct > 0.2 ? "text-warning" : "text-danger";
  const bgColor =
    pct > 0.5 ? "bg-success" : pct > 0.2 ? "bg-warning" : "bg-danger";
  const borderColor =
    pct > 0.5 ? "border-success/30" : pct > 0.2 ? "border-warning/30" : "border-danger/30";

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${borderColor} bg-bg-card`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${bgColor} ${remaining <= 10 ? "animate-pulse" : ""}`} />
        <span className="text-sm font-medium text-text-muted">
          {isMyTurn ? "Your turn" : "Opponent's turn"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${bgColor} rounded-full`}
            initial={{ width: "100%" }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className={`font-mono font-bold text-lg tabular-nums ${color}`}>
          {remaining}s
        </span>
      </div>
    </div>
  );
}

function DigitInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (value: string) => void;
  disabled: boolean;
}) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const refs = [ref0, ref1, ref2, ref3];

  const filledDigits = digits.filter((d) => d !== "");
  const isValid = filledDigits.length === 4;

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 3) refs[index + 1].current?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
    if (e.key === "Enter" && isValid) {
      onSubmit(digits.join(""));
      setDigits(["", "", "", ""]);
      refs[0].current?.focus();
    }
  };

  const submit = () => {
    if (!isValid) return;
    onSubmit(digits.join(""));
    setDigits(["", "", "", ""]);
    refs[0].current?.focus();
  };

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
            className={`w-12 h-14 sm:w-14 sm:h-16 bg-bg-elevated border-2 rounded-xl text-center font-mono text-2xl font-bold focus:outline-none transition-colors disabled:opacity-40 ${
              d ? "border-accent text-text" : "border-border text-text"
            }`}
            placeholder="·"
          />
        ))}
      </div>
      <button
        onClick={submit}
        disabled={disabled || !isValid}
        className="px-8 py-2.5 bg-accent text-bg font-semibold rounded-lg hover:brightness-110 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed text-sm"
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
      <span className="text-text-dim text-[10px] font-mono w-4 text-right shrink-0">
        {index + 1}
      </span>
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
      <div className="flex items-center gap-1.5 ml-1.5">
        {bulls > 0 && (
          <span className="flex items-center gap-0.5 bg-bull/15 text-bull text-xs font-bold pl-1 pr-1.5 py-0.5 rounded-full">
            <span className="text-[11px]">🎯</span>{bulls}
          </span>
        )}
        {cows > 0 && (
          <span className="flex items-center gap-0.5 bg-cow/15 text-cow text-xs font-bold pl-1 pr-1.5 py-0.5 rounded-full">
            <span className="text-[11px]">🔄</span>{cows}
          </span>
        )}
        {bulls === 0 && cows === 0 && (
          <span className="text-text-dim text-xs">✕</span>
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
  mySecret,
}: {
  label: string;
  avatarUrl: string;
  isMe: boolean;
  guesses: { guess: string; bulls: number; cows: number }[];
  secretSet: boolean;
  won: boolean;
  mySecret?: string;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
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
              {won ? "Won!" : secretSet ? `${guesses.length} guesses` : "Setting secret..."}
            </div>
          </div>
        </div>
        {isMe && mySecret && (
          <div className="text-right">
            <div className="text-[10px] text-text-dim uppercase tracking-wider">Your secret</div>
            <div className="font-mono font-bold text-accent text-sm tracking-widest">{mySecret}</div>
          </div>
        )}
      </div>

      <div className="flex-1 bg-bg-elevated/50 rounded-xl p-3 overflow-y-auto max-h-[400px]">
        {guesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-text-dim text-sm gap-2">
            <span>No guesses yet</span>
            <div className="flex flex-col items-start gap-1 text-[11px]">
              <span>🎯 = doğru rakam, doğru yer</span>
              <span>🔄 = doğru rakam, yanlış yer</span>
              <span>✕ = hiçbiri yok</span>
            </div>
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
  const game = useGame(socket, gameId);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

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

      {/* Secret Setting Modal */}
      <AnimatePresence>
        {game.status === "waiting_secrets" && !game.mySecretSet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center"
            >
              <div className="text-3xl mb-2">🔒</div>
              <h2 className="text-xl font-bold mb-1">Choose Your Secret</h2>
              <p className="text-text-muted text-sm mb-6">Pick 4 unique digits for your opponent to guess</p>
              <DigitInput onSubmit={game.setSecret} disabled={false} />
            </motion.div>
          </motion.div>
        )}

        {game.status === "waiting_secrets" && game.mySecretSet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div className="bg-bg-card border border-accent/20 rounded-2xl p-8 max-w-sm w-full text-center">
              <div className="text-accent text-lg font-medium mb-2">Secret Set!</div>
              <div className="font-mono text-2xl font-bold text-accent tracking-[0.3em] mb-3">{game.mySecret}</div>
              <p className="text-text-muted text-sm">
                {game.opponentSecretSet ? "Starting..." : "Waiting for opponent..."}
              </p>
              {!game.opponentSecretSet && (
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mt-3" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split Screen Game Board - active turn panel grows */}
      <div className="flex-1 flex flex-col sm:flex-row gap-3">
        <motion.div
          animate={{ flex: game.isMyTurn ? 3 : 2 }}
          transition={{ duration: 0.3 }}
          className="min-w-0"
        >
          <PlayerPanel
            label={session?.user?.name || "You"}
            avatarUrl={session?.user?.image || ""}
            isMe={true}
            guesses={game.myGuesses}
            secretSet={game.mySecretSet}
            won={isWinner}
            mySecret={game.mySecret || undefined}
          />
        </motion.div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-border relative flex-shrink-0">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-bg px-1 py-2">
            <span className="text-text-dim text-xs font-mono">VS</span>
          </div>
        </div>
        <div className="sm:hidden h-px bg-border" />

        <motion.div
          animate={{ flex: game.isMyTurn ? 2 : 3 }}
          transition={{ duration: 0.3 }}
          className="min-w-0"
        >
          <PlayerPanel
            label={game.opponent.displayName}
            avatarUrl={game.opponent.avatarUrl}
            isMe={false}
            guesses={game.opponentGuesses}
            secretSet={game.opponentSecretSet}
            won={game.result?.winnerId === game.opponent.userId}
          />
        </motion.div>
      </div>

      {/* Timer + Guess Input */}
      {game.status === "in_progress" && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <TurnTimer deadline={game.turnDeadline} isMyTurn={game.isMyTurn} />

          {game.isMyTurn ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-card border border-accent/20 rounded-2xl p-5 text-center w-full"
            >
              <p className="text-accent text-sm font-medium mb-3">Your turn — enter your guess</p>
              <DigitInput onSubmit={game.submitGuess} disabled={false} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-bg-card border border-border rounded-2xl p-5 text-center w-full"
            >
              <div className="flex items-center justify-center gap-2 text-text-muted">
                <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Waiting for opponent...</span>
              </div>
            </motion.div>
          )}
        </div>
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
                  : game.result.reason === "timeout"
                    ? isWinner ? "Opponent ran out of time!" : "You ran out of time!"
                    : `Finished in ${game.myGuesses.length} guesses`}
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
