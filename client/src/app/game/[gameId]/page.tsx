"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { useGame } from "@/hooks/useGame";

function TurnTimer({ deadline, isMyTurn, frozen }: { deadline: number | null; isMyTurn: boolean; frozen?: boolean }) {
  const [remaining, setRemaining] = useState(60);

  useEffect(() => {
    if (!deadline || frozen) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [deadline, frozen]);

  const pct = deadline ? remaining / 60 : 1;
  const color = pct > 0.5 ? "text-success" : pct > 0.2 ? "text-warning" : "text-danger animate-pulse";
  const barColor = pct > 0.5 ? "bg-success" : pct > 0.2 ? "bg-warning" : "bg-danger";

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-sm font-bold tabular-nums ${color}`}>
        {deadline ? `${remaining}s` : "..."}
      </span>
      <div className="w-16 sm:w-24 h-1 bg-bg-elevated rounded-full overflow-hidden">
        <motion.div className={`h-full ${barColor} rounded-full`}
          animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.3 }} />
      </div>
      <span className="text-[10px] text-text-dim hidden sm:inline">
        {isMyTurn ? "you" : "opp"}
      </span>
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
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-bull inline-block" /> = right spot</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-cow inline-block" /> = wrong spot</span>
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

  // Auto-focus first input on mount
  useEffect(() => {
    ref0.current?.focus();
  }, []);

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
            className={`w-11 h-12 sm:w-12 sm:h-13 bg-bg-elevated border-2 rounded-lg text-center font-mono text-xl font-bold focus:outline-none transition-colors disabled:opacity-40 ${
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex flex-col gap-0.5"
    >
      <div className="flex items-center gap-1">
        <span className="text-text-dim text-[9px] font-mono w-3 text-right shrink-0">{index + 1}</span>
        {guess.split("").map((d, i) => (
          <div key={i} className="w-7 h-7 bg-bg-elevated rounded flex items-center justify-center font-mono text-xs font-bold text-text">
            {d}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 ml-4">
        {Array.from({ length: bulls }).map((_, i) => <span key={`b${i}`} className="w-2.5 h-2.5 rounded-full bg-bull inline-block" />)}
        {Array.from({ length: cows }).map((_, i) => <span key={`c${i}`} className="w-2.5 h-2.5 rounded-full border-2 border-cow inline-block" />)}
        {bulls === 0 && cows === 0 && <span className="text-text-dim text-[10px]">--</span>}
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
          {!isMe && label.includes("AI") ? (
            <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="8" width="14" height="12" rx="2" />
              <circle cx="9" cy="13" r="1.5" fill="currentColor" />
              <circle cx="15" cy="13" r="1.5" fill="currentColor" />
              <path d="M10 17h4" strokeLinecap="round" />
              <path d="M12 4v4" />
              <circle cx="12" cy="3" r="1" fill="currentColor" />
              <path d="M3 14h2M19 14h2" strokeLinecap="round" />
            </svg>
          ) : avatarUrl ? <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" /> : label[0]?.toUpperCase()}
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

function TutorialBubble({ text, onDismiss, id }: { text: string; onDismiss: () => void; id: string }) {
  return (
    <motion.div key={id} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className="mb-2 relative z-[60]">
      <div className="bg-accent text-bg rounded-lg px-3 py-2 shadow-lg text-xs font-medium flex items-start gap-2">
        <span className="flex-1">{text}</span>
        <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer text-[10px] font-bold">OK</button>
      </div>
    </motion.div>
  );
}

function TutorialOverlay() {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[55] bg-black/50 pointer-events-none" />;
}

interface TutorialTips {
  input: { text: string; key: string } | null;
  notepad: { text: string; key: string } | null;
  guessArea: { text: string; key: string } | null;
  hasActiveTip: boolean;
  dismiss: (key: string) => void;
  isTutorial: boolean;
}

function useTutorialTips(guesses: { bulls: number; cows: number }[], notepadOpen: boolean, gameActive: boolean, searchParams: ReturnType<typeof useSearchParams>): TutorialTips {
  const isTutorial = searchParams.has("tutorial");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dismiss = (key: string) => setDismissed(prev => new Set(prev).add(key));

  const empty: TutorialTips = { input: null, notepad: null, guessArea: null, hasActiveTip: false, dismiss, isTutorial };
  if (!isTutorial || !gameActive) return empty;

  const guessCount = guesses.length;

  // Track first occurrences
  const hadBull = guesses.some(g => g.bulls > 0);
  const hadCow = guesses.some(g => g.cows > 0);
  const hadMiss = guesses.some(g => g.bulls === 0 && g.cows === 0);
  const lastGuess = guesses[guessCount - 1];

  let input: TutorialTips["input"] = null;
  let notepad: TutorialTips["notepad"] = null;
  let guessArea: TutorialTips["guessArea"] = null;

  // 1) First guess prompt
  if (guessCount === 0 && !dismissed.has("start")) {
    input = { text: "Enter 4 digits and tap Confirm to make your first guess!", key: "start" };
  }

  // 2) First bull ever
  if (hadBull && !dismissed.has("bull_explain")) {
    const g = guesses.find(g => g.bulls > 0)!;
    guessArea = { text: `● Filled dot = digit in the RIGHT position! You have ${g.bulls}. Try to figure out which digit(s).`, key: "bull_explain" };
  }

  // 3) First cow ever (only if bull explanation already dismissed)
  if (hadCow && dismissed.has("bull_explain") && !dismissed.has("cow_explain")) {
    const g = guesses.find(g => g.cows > 0)!;
    guessArea = { text: `○ Hollow dot = digit EXISTS but in the WRONG spot. You have ${g.cows}. Try swapping positions!`, key: "cow_explain" };
  }

  // 4) First all-miss (only if bull+cow done)
  if (hadMiss && dismissed.has("bull_explain") && dismissed.has("cow_explain") && !dismissed.has("miss_explain")) {
    guessArea = { text: "All grey = none of those digits are in the number. You can safely eliminate them!", key: "miss_explain" };
  }

  // 5) Notepad hint after 2 guesses
  if (guessCount >= 2 && !notepadOpen && !guessArea && !dismissed.has("notepad_hint")) {
    input = { text: "Tip: Tap 'Notepad' to track your findings! Place known digits into slots.", key: "notepad_hint" };
  }

  // 6) Notepad usage on first open
  if (notepadOpen && !dismissed.has("notepad_use")) {
    notepad = { text: "Tap a slot (1-4) to select it, then tap a digit to place it there. Known positions turn green!", key: "notepad_use" };
  }

  // 7) Getting close
  if (guessCount >= 3 && lastGuess && lastGuess.bulls >= 2 && !guessArea && !dismissed.has("close")) {
    guessArea = { text: `${lastGuess.bulls} in the right spot — almost there! Focus on the remaining positions.`, key: "close" };
  }

  const hasActiveTip = !!(input || notepad || guessArea);
  return { input, notepad, guessArea, hasActiveTip, dismiss, isTutorial };
}

function SecretModal({ onSubmit }: { onSubmit: (secret: string) => void }) {
  const [remaining, setRemaining] = useState(30);
  const [deadline] = useState(() => Date.now() + 30000);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        // Auto-generate random secret
        const digits = [0,1,2,3,4,5,6,7,8,9];
        for (let i = digits.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [digits[i], digits[j]] = [digits[j], digits[i]]; }
        onSubmit(digits.slice(0, 4).join(""));
      }
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [deadline, onSubmit]);

  const pct = remaining / 30;
  const circumference = 2 * Math.PI * 58;
  const dashOffset = circumference * (1 - pct);
  const color = pct > 0.5 ? "#6ee7a0" : pct > 0.2 ? "#f0d45b" : "#f07070";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="relative max-w-sm w-full">
        {/* Circular timer around modal */}
        <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]" viewBox="0 0 120 140" preserveAspectRatio="none">
          <rect x="1" y="1" width="118" height="138" rx="18" fill="none" stroke={color} strokeWidth="2"
            strokeDasharray={`${2*(118+138)}`} strokeDashoffset={`${2*(118+138) * (1 - pct)}`}
            opacity="0.6" className="transition-all duration-200" />
        </svg>
        <div className="bg-bg-card border border-border rounded-2xl p-8 text-center relative">
          <div className="absolute top-3 right-4">
            <span className={`font-mono text-sm font-bold ${pct > 0.5 ? "text-success" : pct > 0.2 ? "text-warning" : "text-danger animate-pulse"}`}>
              {remaining}s
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1">Choose Your Secret</h2>
          <p className="text-text-muted text-sm mb-6">Pick 4 unique digits. Auto-picks in {remaining}s</p>
          <DigitInput onSubmit={onSubmit} disabled={false} />
        </div>
      </motion.div>
    </motion.div>
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
  const searchParams = useSearchParams();
  const tutorial = useTutorialTips(game.myGuesses, notepadOpen, game.status === "in_progress", searchParams);

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
          {game.status === "in_progress" && <TurnTimer deadline={game.turnDeadline} isMyTurn={game.isMyTurn} frozen={tutorial.hasActiveTip} />}
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

      {/* Tutorial spotlight overlay */}
      <AnimatePresence>
        {tutorial.hasActiveTip && <TutorialOverlay />}
      </AnimatePresence>

      {/* Secret Setting Modal with 30s timer */}
      <AnimatePresence>
        {game.status === "waiting_secrets" && !game.mySecretSet && (
          <SecretModal onSubmit={game.setSecret} />
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
        <div className={`flex-1 min-w-0 flex flex-col rounded-xl border transition-colors duration-300 ${game.isMyTurn ? "border-accent/20 bg-bg-card/50" : "border-border/50"}`}>
          <PlayerPanel
            label={session?.user?.name || "You"} avatarUrl={session?.user?.image || ""}
            isMe={true} guesses={game.myGuesses} secretSet={game.mySecretSet} won={isWinner} mySecret={game.mySecret || undefined}
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-border relative shrink-0 my-2">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-bg text-text-dim text-[10px] font-mono px-1 py-1">VS</div>
        </div>

        {/* Opponent panel */}
        <div className={`flex-1 min-w-0 flex flex-col rounded-xl border transition-colors duration-300 ${!game.isMyTurn ? "border-accent/20 bg-bg-card/50" : "border-border/50"}`}>
          <PlayerPanel
            label={game.opponent.displayName} avatarUrl={game.opponent.avatarUrl}
            isMe={false} guesses={game.opponentGuesses} secretSet={game.opponentSecretSet}
            won={game.result?.winnerId === game.opponent.userId}
          />
        </div>

        {/* Notepad sidebar - desktop only */}
        {game.status === "in_progress" && (
          <div className="hidden lg:block w-52 shrink-0">
            <AnimatePresence>
              {tutorial.notepad && <TutorialBubble id={tutorial.notepad.key} text={tutorial.notepad.text} onDismiss={() => tutorial.dismiss(tutorial.notepad!.key)} />}
            </AnimatePresence>
            <Notepad guesses={game.myGuesses} />
          </div>
        )}
      </div>

      {/* Bottom bar: input + notepad toggle (sticky) */}
      {game.status === "in_progress" && (
        <div className={`shrink-0 px-4 pb-3 pt-2 border-t border-border bg-bg/80 backdrop-blur-sm ${tutorial.hasActiveTip ? "relative z-[60]" : ""}`}>
          {/* Tutorial: guess area tip */}
          <AnimatePresence>
            {tutorial.guessArea && <TutorialBubble id={tutorial.guessArea.key} text={tutorial.guessArea.text} onDismiss={() => tutorial.dismiss(tutorial.guessArea!.key)} />}
          </AnimatePresence>

          {game.isMyTurn ? (
            <>
              {/* Tutorial: input tip */}
              <AnimatePresence>
                {tutorial.input && <TutorialBubble id={tutorial.input.key} text={tutorial.input.text} onDismiss={() => tutorial.dismiss(tutorial.input!.key)} />}
              </AnimatePresence>
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
            </>
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
                  {/* Tutorial: notepad tip */}
                  <AnimatePresence>
                    {tutorial.notepad && <TutorialBubble id={tutorial.notepad.key} text={tutorial.notepad.text} onDismiss={() => tutorial.dismiss(tutorial.notepad!.key)} />}
                  </AnimatePresence>
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

      {/* Game Over - Full Summary Page */}
      {game.status === "completed" && game.result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-bg overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Result header */}
            <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className="text-center mb-6">
              <div className="text-4xl mb-2">{isDraw ? "🤝" : isWinner ? "🎉" : "😤"}</div>
              <h2 className="text-2xl font-bold">{isDraw ? "Draw!" : isWinner ? "Victory!" : "Defeat"}</h2>
              <p className="text-text-muted text-sm mt-1">
                {game.result.reason === "opponent_quit" ? "Opponent quit"
                  : game.result.reason === "timeout" ? (isWinner ? "Opponent timed out" : "You timed out")
                  : `${Math.max(game.myGuesses.length, game.opponentGuesses.length)} rounds played`}
              </p>
              {game.result.eloChange && (
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold ${isWinner ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                  ELO {isWinner ? "+" : ""}{game.myRole === "host" ? game.result.eloChange.host : game.result.eloChange.challenger}
                </span>
              )}
            </motion.div>

            {/* Secrets reveal */}
            <div className="flex gap-4 mb-6">
              <div className={`flex-1 rounded-xl p-4 text-center border ${isWinner ? "border-success/30 bg-success/5" : "border-border bg-bg-card"}`}>
                <div className="text-xs text-text-dim mb-1">Your secret</div>
                <div className="font-mono text-2xl font-bold text-accent tracking-widest">
                  {game.myRole === "host" ? game.result.hostSecret : game.result.challengerSecret}
                </div>
                <div className="text-xs text-text-dim mt-1">{game.myGuesses.length} guesses</div>
              </div>
              <div className={`flex-1 rounded-xl p-4 text-center border ${!isWinner && !isDraw ? "border-success/30 bg-success/5" : "border-border bg-bg-card"}`}>
                <div className="text-xs text-text-dim mb-1 flex items-center justify-center gap-1">
                  {game.opponent?.displayName.includes("AI") && (
                    <svg className="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="5" y="8" width="14" height="12" rx="2" />
                      <circle cx="9" cy="13" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="13" r="1.5" fill="currentColor" />
                      <path d="M10 17h4" strokeLinecap="round" />
                      <path d="M12 4v4" />
                      <circle cx="12" cy="3" r="1" fill="currentColor" />
                      <path d="M3 14h2M19 14h2" strokeLinecap="round" />
                    </svg>
                  )}
                  {game.opponent?.displayName}
                </div>
                <div className="font-mono text-2xl font-bold text-accent tracking-widest">
                  {game.myRole === "host" ? game.result.challengerSecret : game.result.hostSecret}
                </div>
                <div className="text-xs text-text-dim mt-1">{game.opponentGuesses.length} guesses</div>
              </div>
            </div>

            {/* Move history side by side - color coded digits */}
            <div className="flex gap-3 mb-6">
              {[
                { label: "Your moves", target: game.myRole === "host" ? game.result.challengerSecret : game.result.hostSecret, guesses: game.myGuesses, secret: game.myRole === "host" ? game.result.challengerSecret : game.result.hostSecret },
                { label: `${game.opponent?.displayName}'s moves`, target: game.myRole === "host" ? game.result.hostSecret : game.result.challengerSecret, guesses: game.opponentGuesses, secret: game.myRole === "host" ? game.result.hostSecret : game.result.challengerSecret },
              ].map(({ label, target, guesses, secret }) => (
                <div key={label} className="flex-1 min-w-0">
                  <div className="text-xs text-text-dim font-medium mb-1.5 px-1">{label}</div>
                  {/* Target number - same style as guess rows */}
                  <div className="flex items-center gap-0.5 mb-2 px-2 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
                    <span className="text-[9px] text-accent w-3 shrink-0">?</span>
                    <div className="flex gap-0.5">
                      {target.split("").map((d, j) => (
                        <span key={j} className="w-5 h-5 rounded flex items-center justify-center font-mono text-[11px] bg-accent/20 text-accent font-bold">{d}</span>
                      ))}
                    </div>
                    <span className="ml-auto text-[10px] text-accent">secret</span>
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl p-2 space-y-1.5 max-h-72 overflow-y-auto">
                    {guesses.map((g, i) => {
                      // Color each digit: green=bull, blue=cow, dim=miss
                      const digitColors = g.guess.split("").map((d, pos) => {
                        if (d === secret[pos]) return "text-bull font-bold";
                        if (secret.includes(d)) return "text-cow font-bold";
                        return "text-text-dim";
                      });
                      return (
                        <div key={i} className="flex items-center gap-0.5 text-[11px]">
                          <span className="text-text-dim w-3 text-right font-mono shrink-0">{i+1}</span>
                          <div className="flex gap-0.5">
                            {g.guess.split("").map((d, j) => (
                              <span key={j} className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[11px] ${
                                digitColors[j] === "text-bull font-bold" ? "bg-bull/20 text-bull font-bold"
                                : digitColors[j] === "text-cow font-bold" ? "bg-cow/20 text-cow font-bold"
                                : "bg-bg-elevated text-text-dim"
                              }`}>{d}</span>
                            ))}
                          </div>
                          <span className="ml-auto flex gap-0.5 shrink-0">
                            {Array.from({ length: g.bulls }).map((_, k) => <span key={`b${k}`} className="w-2 h-2 rounded-full bg-bull inline-block" />)}
                            {Array.from({ length: g.cows }).map((_, k) => <span key={`c${k}`} className="w-2 h-2 rounded-full border-[1.5px] border-cow inline-block" />)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => { game.reset(); router.push("/lobby"); }}
                className="flex-1 py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 transition-all cursor-pointer active:scale-[0.98]">
                Back to Lobby
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
