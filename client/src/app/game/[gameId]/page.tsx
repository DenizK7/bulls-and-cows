"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { useGame } from "@/hooks/useGame";

function TurnTimer({ deadline, isMyTurn }: { deadline: number | null; isMyTurn: boolean }) {
  const [remaining, setRemaining] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [turnStart] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) {
      // AI mode - count up
      const interval = setInterval(() => setElapsed(Math.floor((Date.now() - turnStart) / 1000)), 200);
      return () => clearInterval(interval);
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [deadline, turnStart]);

  // No deadline = AI game, show elapsed time
  if (!deadline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-accent/20 bg-bg-card">
        <div className={`w-2 h-2 rounded-full ${isMyTurn ? "bg-accent animate-pulse" : "bg-text-dim animate-pulse"}`} />
        <span className="text-sm font-medium text-text-muted">
          {isMyTurn ? "Your turn" : "AI is thinking..."}
        </span>
        <span className="font-mono text-sm text-text-dim tabular-nums">{elapsed}s</span>
      </div>
    );
  }

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

function Notepad({
  guesses,
}: {
  guesses: { guess: string; bulls: number; cows: number }[];
}) {
  const [slots, setSlots] = useState(["", "", "", ""]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const digitStatus = (() => {
    const status: Record<string, "unknown" | "exists" | "eliminated"> = {};
    for (let d = 0; d <= 9; d++) status[String(d)] = "unknown";
    for (const g of guesses) {
      if (g.bulls === 0 && g.cows === 0) {
        for (const d of g.guess) status[d] = "eliminated";
      }
    }
    for (const g of guesses) {
      if (g.bulls + g.cows > 0) {
        for (const d of g.guess) {
          if (status[d] !== "eliminated") status[d] = "exists";
        }
      }
    }
    return status;
  })();

  const placeDigit = (digit: string) => {
    const n = [...slots];
    if (selectedSlot !== null) {
      // Place in selected slot
      n[selectedSlot] = n[selectedSlot] === digit ? "" : digit;
      setSlots(n);
      setSelectedSlot(null);
    } else {
      // Place in first empty slot
      const emptyIdx = n.findIndex((s) => s === "");
      if (emptyIdx !== -1) { n[emptyIdx] = digit; setSlots(n); }
    }
  };

  const tapSlot = (i: number) => {
    if (slots[i]) {
      // Clear if filled
      const n = [...slots]; n[i] = ""; setSlots(n);
      setSelectedSlot(null);
    } else {
      // Select for next digit placement
      setSelectedSlot(selectedSlot === i ? null : i);
    }
  };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-text-dim uppercase tracking-wider font-medium">Notepad</span>
      </div>

      {/* 4 note slots + clear button */}
      <div className="flex gap-1.5 mb-2 justify-center items-center">
        {slots.map((s, i) => (
          <button
            key={i}
            onClick={() => tapSlot(i)}
            className={`w-10 h-11 rounded-lg border-2 flex items-center justify-center font-mono text-lg font-bold transition-all cursor-pointer ${
              selectedSlot === i
                ? "border-accent bg-accent/10 text-accent animate-pulse"
                : s
                  ? "border-success/50 bg-success/10 text-success"
                  : "border-border border-dashed text-text-dim hover:border-border-light"
            }`}
          >
            {s || <span className="text-xs opacity-50">{i + 1}</span>}
          </button>
        ))}
        <button
          onClick={() => { setSlots(["", "", "", ""]); setSelectedSlot(null); }}
          className="h-11 px-2 rounded-lg border border-border text-[10px] text-text-dim hover:text-danger hover:border-danger/30 transition-all cursor-pointer flex items-center justify-center"
        >
          Clear
        </button>
      </div>

      {selectedSlot !== null && (
        <p className="text-[10px] text-accent text-center mb-2">
          Slot {selectedSlot + 1} selected — tap a digit below
        </p>
      )}

      {/* 0-9 digit tracker */}
      <div className="flex flex-wrap gap-1 justify-center">
        {Array.from({ length: 10 }, (_, d) => String(d)).map((d) => {
          const s = digitStatus[d];
          const inSlot = slots.includes(d);
          const bg =
            inSlot
              ? "bg-success/20 text-success border-success/40"
              : s === "eliminated"
                ? "bg-danger/10 text-danger/50 border-danger/20 line-through"
                : s === "exists"
                  ? "bg-cow/15 text-cow border-cow/30"
                  : "bg-bg-elevated text-text-muted border-border";

          return (
            <button
              key={d}
              onClick={() => placeDigit(d)}
              className={`w-8 h-8 rounded-md border text-xs font-bold font-mono cursor-pointer transition-all hover:brightness-125 ${bg}`}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="flex justify-center gap-3 mt-2 text-[9px] text-text-dim">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cow inline-block" />maybe</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" />placed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger/50 inline-block" />nope</span>
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
    <div className="flex-1 flex flex-col min-w-0 p-2">
      {/* Compact header */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
          isMe ? "bg-accent/20 text-accent" : "bg-bg-elevated text-text-muted"
        }`}>
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" /> : label[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium truncate">{label}</div>
        </div>
        {isMe && mySecret && (
          <div className="font-mono text-[10px] font-bold text-accent">{mySecret}</div>
        )}
        <span className="text-[10px] text-text-dim">{guesses.length}</span>
      </div>

      {/* Guess list */}
      <div className="flex-1 overflow-y-auto">
        {guesses.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-text-dim text-xs">
            {isMe ? "Your guesses" : "Their guesses"}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {guesses.map((g, i) => (
              <GuessRow key={i} index={i} guess={g.guess} bulls={g.bulls} cows={g.cows} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GamePanelTabs({
  myName, myAvatar, myGuesses, mySecretSet, mySecret, isWinner,
  opponentName, opponentAvatar, opponentGuesses, opponentSecretSet, opponentWon,
  isMyTurn,
}: {
  myName: string; myAvatar: string;
  myGuesses: { guess: string; bulls: number; cows: number }[];
  mySecretSet: boolean; mySecret?: string; isWinner: boolean;
  opponentName: string; opponentAvatar: string;
  opponentGuesses: { guess: string; bulls: number; cows: number }[];
  opponentSecretSet: boolean; opponentWon: boolean;
  isMyTurn: boolean;
}) {
  const [viewTab, setViewTab] = useState<"me" | "opponent">(isMyTurn ? "me" : "opponent");

  // Auto-switch to active player's tab when turn changes
  useEffect(() => {
    setViewTab(isMyTurn ? "me" : "opponent");
  }, [isMyTurn]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab bar */}
      <div className="flex bg-bg-card rounded-xl p-1 border border-border mb-3">
        <button
          onClick={() => setViewTab("me")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
            viewTab === "me" ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"
          }`}
        >
          {myAvatar ? <img src={myAvatar} alt="" className="w-5 h-5 rounded-full" /> : null}
          You ({myGuesses.length})
          {isMyTurn && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
        </button>
        <button
          onClick={() => setViewTab("opponent")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
            viewTab === "opponent" ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"
          }`}
        >
          {opponentAvatar ? <img src={opponentAvatar} alt="" className="w-5 h-5 rounded-full" /> : null}
          {opponentName} ({opponentGuesses.length})
          {!isMyTurn && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
        </button>
      </div>

      {/* Active panel */}
      <AnimatePresence mode="wait">
        {viewTab === "me" ? (
          <motion.div key="me" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex-1 min-h-0">
            <PlayerPanel
              label={myName} avatarUrl={myAvatar} isMe={true}
              guesses={myGuesses} secretSet={mySecretSet} won={isWinner} mySecret={mySecret}
            />
          </motion.div>
        ) : (
          <motion.div key="opp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 min-h-0">
            <PlayerPanel
              label={opponentName} avatarUrl={opponentAvatar} isMe={false}
              guesses={opponentGuesses} secretSet={opponentSecretSet} won={opponentWon}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [quitConfirm, setQuitConfirm] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  const userId = (session as { userId?: string })?.userId;
  const isWinner = game.result?.winnerId === userId;
  const isDraw = game.result?.reason === "draw";

  if (!game.gameId || !game.opponent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto w-full">
      {/* Top bar: timer takes center stage */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold shrink-0">
          <span className="text-bull">B</span><span className="text-text-dim">&</span><span className="text-cow">C</span>
        </h1>
        <div className="flex-1 flex justify-center">
          {game.status === "in_progress" && <TurnTimer deadline={game.turnDeadline} isMyTurn={game.isMyTurn} />}
        </div>
        {game.status !== "completed" && (
          <button onClick={() => setQuitConfirm(true)}
            className="shrink-0 text-xs text-text-dim border border-border hover:border-danger/30 hover:text-danger hover:bg-danger/5 transition-all cursor-pointer px-3 py-1.5 rounded-lg">
            Leave
          </button>
        )}
      </div>

      {/* Quit confirmation modal */}
      <AnimatePresence>
        {quitConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-border rounded-2xl p-6 max-w-xs w-full text-center">
              <h3 className="text-lg font-bold mb-2">Leave Game?</h3>
              <p className="text-text-muted text-sm mb-5">The game is still in progress. You will forfeit if you leave.</p>
              <div className="flex gap-2">
                <button onClick={() => setQuitConfirm(false)}
                  className="flex-1 py-2.5 bg-bg-elevated border border-border text-text font-medium rounded-xl hover:bg-bg-hover cursor-pointer">
                  Stay
                </button>
                <button onClick={() => { game.quitGame(); router.push("/lobby"); }}
                  className="flex-1 py-2.5 bg-danger text-white font-medium rounded-xl hover:brightness-110 cursor-pointer">
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secret Setting Modal */}
      <AnimatePresence>
        {game.status === "waiting_secrets" && !game.mySecretSet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center">
              <h2 className="text-xl font-bold mb-1">Choose Your Secret</h2>
              <p className="text-text-muted text-sm mb-6">Pick 4 unique digits for your opponent to guess</p>
              <DigitInput onSubmit={game.setSecret} disabled={false} />
            </motion.div>
          </motion.div>
        )}
        {game.status === "waiting_secrets" && game.mySecretSet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div className="bg-bg-card border border-accent/20 rounded-2xl p-8 max-w-sm w-full text-center">
              <div className="text-accent text-lg font-medium mb-2">Secret Set!</div>
              <div className="font-mono text-2xl font-bold text-accent tracking-[0.3em] mb-3">{game.mySecret}</div>
              <p className="text-text-muted text-sm">{game.opponentSecretSet ? "Starting..." : "Waiting for opponent..."}</p>
              {!game.opponentSecretSet && <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mt-3" />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split screen - both always visible, active panel grows */}
      <div className="flex-1 flex min-h-0 px-3 sm:px-4 gap-2 sm:gap-3">
        {/* My panel */}
        <motion.div
          animate={{ flex: game.isMyTurn ? 3 : 2 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className={`min-w-0 flex flex-col rounded-xl border transition-colors duration-300 ${game.isMyTurn ? "border-accent/20 bg-bg-card/50" : "border-border/50"}`}
        >
          <PlayerPanel
            label={session?.user?.name || "You"} avatarUrl={session?.user?.image || ""}
            isMe={true} guesses={game.myGuesses} secretSet={game.mySecretSet} won={isWinner} mySecret={game.mySecret || undefined}
          />
        </motion.div>

        {/* Divider */}
        <div className="w-px bg-border relative shrink-0 my-2">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-bg text-text-dim text-[10px] font-mono px-1 py-1">VS</div>
        </div>

        {/* Opponent panel */}
        <motion.div
          animate={{ flex: game.isMyTurn ? 2 : 3 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className={`min-w-0 flex flex-col rounded-xl border transition-colors duration-300 ${!game.isMyTurn ? "border-accent/20 bg-bg-card/50" : "border-border/50"}`}
        >
          <PlayerPanel
            label={game.opponent.displayName} avatarUrl={game.opponent.avatarUrl}
            isMe={false} guesses={game.opponentGuesses} secretSet={game.opponentSecretSet}
            won={game.result?.winnerId === game.opponent.userId}
          />
        </motion.div>

        {/* Notepad sidebar - desktop only */}
        {game.status === "in_progress" && (
          <div className="hidden lg:block w-52 shrink-0">
            <Notepad guesses={game.myGuesses} />
          </div>
        )}
      </div>

      {/* Bottom bar: input + notepad toggle (sticky) */}
      {game.status === "in_progress" && (
        <div className="shrink-0 px-4 pb-3 pt-2 border-t border-border bg-bg/80 backdrop-blur-sm">
          {game.isMyTurn ? (
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <DigitInput onSubmit={game.submitGuess} disabled={false} />
              </div>
              <button
                onClick={() => setNotepadOpen(!notepadOpen)}
                className={`lg:hidden shrink-0 h-10 px-3 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all text-xs font-medium ${
                  notepadOpen ? "bg-accent/15 border-accent/30 text-accent" : "bg-bg-elevated border-border text-text-muted"
                }`}
              >
                Notepad
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-text-muted">
              <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">{game.opponent?.displayName} is thinking...</span>
              <button
                onClick={() => setNotepadOpen(!notepadOpen)}
                className={`lg:hidden ml-2 shrink-0 h-8 px-2.5 rounded-lg border flex items-center justify-center cursor-pointer transition-all text-xs font-medium ${
                  notepadOpen ? "bg-accent/15 border-accent/30 text-accent" : "bg-bg-elevated border-border text-text-muted"
                }`}
              >
                Notepad
              </button>
            </div>
          )}

          {/* Mobile notepad drawer */}
          <AnimatePresence>
            {notepadOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="lg:hidden overflow-hidden mt-2">
                <div className="relative">
                  <button onClick={() => setNotepadOpen(false)}
                    className="absolute top-2 right-2 text-[10px] text-text-dim hover:text-text-muted cursor-pointer z-10">
                    Close
                  </button>
                  <Notepad guesses={game.myGuesses} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Game Over Modal */}
      <AnimatePresence>
        {game.status === "completed" && game.result && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 30 }} animate={{ y: 0 }}
              className="bg-bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center">
              <div className="text-5xl mb-3">{isDraw ? "🤝" : isWinner ? "🎉" : "😔"}</div>
              <h2 className="text-2xl font-bold mb-1">{isDraw ? "Draw!" : isWinner ? "You Won!" : "You Lost"}</h2>
              <p className="text-text-muted text-sm mb-4">
                {game.result.reason === "opponent_quit" ? "Opponent quit the game"
                  : game.result.reason === "timeout" ? (isWinner ? "Opponent ran out of time!" : "You ran out of time!")
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
                  ELO {isWinner ? "+" : ""}{game.myRole === "host" ? game.result.eloChange.host : game.result.eloChange.challenger}
                </div>
              )}
              <button onClick={() => { game.reset(); router.push("/lobby"); }}
                className="w-full py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 transition-all cursor-pointer active:scale-[0.98]">
                Back to Lobby
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
