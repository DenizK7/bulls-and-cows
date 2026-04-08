"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const SECRET = "5271";

function evaluate(guess: string, secret: string) {
  let bulls = 0, cows = 0;
  const sUsed = Array(4).fill(false), gUsed = Array(4).fill(false);
  for (let i = 0; i < 4; i++) { if (guess[i] === secret[i]) { bulls++; sUsed[i] = true; gUsed[i] = true; } }
  for (let i = 0; i < 4; i++) { if (gUsed[i]) continue; for (let j = 0; j < 4; j++) { if (sUsed[j]) continue; if (guess[i] === secret[j]) { cows++; sUsed[j] = true; break; } } }
  return { bulls, cows };
}

function digitStatus(d: string, pos: number, secret: string): "bull" | "cow" | "miss" {
  if (d === secret[pos]) return "bull";
  if (secret.includes(d)) return "cow";
  return "miss";
}

function getTip(guess: string, bulls: number, cows: number, secret: string, guessCount: number): string {
  if (bulls === 4) return "You cracked it! All 4 digits in the right place. That's how you win!";

  const bullDigits: string[] = [], cowDigits: string[] = [], missDigits: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) bullDigits.push(guess[i]);
    else if (secret.includes(guess[i])) cowDigits.push(guess[i]);
    else missDigits.push(guess[i]);
  }

  const parts: string[] = [];
  if (bullDigits.length > 0) parts.push(`${bullDigits.join(", ")} → right spot! (filled dot)`);
  if (cowDigits.length > 0) parts.push(`${cowDigits.join(", ")} → in the number but wrong spot (hollow dot)`);
  if (missDigits.length > 0) parts.push(`${missDigits.join(", ")} → not in the number at all`);

  let notepadTip = "";
  if (guessCount === 1) notepadTip = "\n\n💡 Tip: Use the Notepad to place digits you're sure about into their slots.";
  if (guessCount === 2) notepadTip = "\n\n💡 Tip: Click a slot in the Notepad, then tap a digit to place it there.";
  if (guessCount === 3) notepadTip = "\n\n💡 Tip: Eliminated digits turn red in the Notepad automatically.";

  return parts.join("\n") + notepadTip;
}

interface Guess { guess: string; bulls: number; cows: number; }

export default function HowToPlayPage() {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [tip, setTip] = useState("");
  const [noteSlots, setNoteSlots] = useState(["", "", "", ""]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const filledDigits = digits.filter(d => d !== "");
  const isValid = filledDigits.length === 4;

  const handleChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const n = [...digits]; n[i] = v; setDigits(n);
  };

  const submitGuess = () => {
    if (!isValid) return;
    const guess = digits.join("");
    const result = evaluate(guess, SECRET);
    const newGuesses = [...guesses, { guess, ...result }];
    setGuesses(newGuesses);
    setTip(getTip(guess, result.bulls, result.cows, SECRET, newGuesses.length));
    setDigits(["", "", "", ""]);
    if (result.bulls === 4) setPhase("done");

    // Auto-fill notepad for known bulls
    const ns = [...noteSlots];
    for (let i = 0; i < 4; i++) {
      if (guess[i] === SECRET[i]) ns[i] = guess[i];
    }
    setNoteSlots(ns);
  };

  // Digit tracker
  const digitTracker = (() => {
    const status: Record<string, "unknown" | "exists" | "eliminated"> = {};
    for (let d = 0; d <= 9; d++) status[String(d)] = "unknown";
    for (const g of guesses) {
      if (g.bulls === 0 && g.cows === 0) for (const d of g.guess) status[d] = "eliminated";
    }
    for (const g of guesses) {
      if (g.bulls + g.cows > 0) for (const d of g.guess) { if (status[d] !== "eliminated") status[d] = "exists"; }
    }
    return status;
  })();

  if (phase === "intro") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-bull/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-cow/5 rounded-full blur-[100px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-sm w-full text-center">
          <h1 className="text-3xl font-bold mb-4">
            <span className="text-bull">Bulls</span> & <span className="text-cow">Cows</span>
          </h1>
          <p className="text-text-muted mb-6">Learn by playing! We{"'"}ll show you a secret number and guide you through each guess.</p>

          <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6 text-left space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full bg-bull mt-1 shrink-0" />
              <p className="text-sm"><strong className="text-bull">Filled dot</strong> = right digit in the right spot</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full border-2 border-cow mt-1 shrink-0" />
              <p className="text-sm"><strong className="text-cow">Hollow dot</strong> = right digit but wrong spot</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full bg-bg-hover mt-1 shrink-0" />
              <p className="text-sm"><strong className="text-text-dim">Grey dot</strong> = digit not in the number</p>
            </div>
          </div>

          <button onClick={() => setPhase("play")}
            className="w-full py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 cursor-pointer transition-all active:scale-[0.98]">
            Start Tutorial
          </button>
          <Link href="/" className="block text-text-dim text-sm mt-4 hover:text-text-muted">← Back to home</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-4">
      {/* Header with visible secret */}
      <div className="flex items-center justify-between mb-3">
        <Link href="/" className="text-text-dim text-sm hover:text-text-muted">← Back</Link>
        <span className="text-xs text-text-dim">Tutorial Mode</span>
      </div>

      {/* Secret - always visible */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4 text-center">
        <div className="text-[10px] text-accent uppercase tracking-wider mb-1">Secret Number (visible in tutorial)</div>
        <div className="flex gap-2 justify-center">
          {SECRET.split("").map((d, i) => (
            <div key={i} className="w-10 h-11 bg-accent/20 border-2 border-accent/40 rounded-lg flex items-center justify-center font-mono text-xl font-bold text-accent">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Guess history */}
      <div className="flex-1 overflow-y-auto mb-3">
        {guesses.length === 0 && (
          <div className="text-center py-8 text-text-dim text-sm">
            <p>Try to guess <span className="font-mono text-accent font-bold">{SECRET}</span></p>
            <p className="text-xs mt-1">Enter 4 digits below and see what happens!</p>
          </div>
        )}
        <div className="space-y-2">
          {guesses.map((g, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-text-dim w-4">{i + 1}</span>
                <div className="flex gap-1">
                  {g.guess.split("").map((d, j) => {
                    const s = digitStatus(d, j, SECRET);
                    return (
                      <div key={j} className={`w-8 h-8 rounded-md flex items-center justify-center font-mono text-sm font-bold ${
                        s === "bull" ? "bg-bull/20 text-bull border border-bull/30"
                        : s === "cow" ? "bg-cow/20 text-cow border border-cow/30"
                        : "bg-bg-elevated text-text-dim border border-border"
                      }`}>{d}</div>
                    );
                  })}
                </div>
                <div className="flex gap-0.5 ml-auto">
                  {Array.from({ length: g.bulls }).map((_, k) => <span key={`b${k}`} className="w-3 h-3 rounded-full bg-bull" />)}
                  {Array.from({ length: g.cows }).map((_, k) => <span key={`c${k}`} className="w-3 h-3 rounded-full border-2 border-cow" />)}
                  {Array.from({ length: 4 - g.bulls - g.cows }).map((_, k) => <span key={`m${k}`} className="w-3 h-3 rounded-full bg-bg-hover" />)}
                </div>
              </div>
              {/* Per-digit explanation */}
              <div className="flex gap-1 ml-5">
                {g.guess.split("").map((d, j) => {
                  const s = digitStatus(d, j, SECRET);
                  return (
                    <span key={j} className={`text-[9px] w-8 text-center ${
                      s === "bull" ? "text-bull" : s === "cow" ? "text-cow" : "text-text-dim"
                    }`}>
                      {s === "bull" ? "right!" : s === "cow" ? "move it" : "nope"}
                    </span>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tip banner */}
      <AnimatePresence>
        {tip && phase === "play" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-3">
            <div className="text-xs text-accent whitespace-pre-line">{tip}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notepad (always visible in tutorial) */}
      {phase === "play" && (
        <div className="bg-bg-card border border-border rounded-xl p-3 mb-3">
          <div className="text-[10px] text-text-dim uppercase tracking-wider mb-2">Notepad — track your findings</div>
          <div className="flex gap-1.5 mb-2 justify-center items-center">
            {noteSlots.map((s, i) => (
              <button key={i} onClick={() => { if (s) { const n = [...noteSlots]; n[i] = ""; setNoteSlots(n); setSelectedSlot(null); } else { setSelectedSlot(selectedSlot === i ? null : i); } }}
                className={`w-9 h-10 rounded-lg border-2 flex items-center justify-center font-mono text-base font-bold cursor-pointer transition-all ${
                  selectedSlot === i ? "border-accent bg-accent/10 text-accent animate-pulse"
                  : s ? "border-success/50 bg-success/10 text-success"
                  : "border-border border-dashed text-text-dim"
                }`}>
                {s || <span className="text-[10px] opacity-50">{i + 1}</span>}
              </button>
            ))}
            <button onClick={() => { setNoteSlots(["", "", "", ""]); setSelectedSlot(null); }}
              className="h-10 px-2 rounded-lg border border-border text-[10px] text-text-dim hover:text-danger cursor-pointer">Clear</button>
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            {Array.from({ length: 10 }, (_, d) => String(d)).map((d) => {
              const s = digitTracker[d];
              const inSlot = noteSlots.includes(d);
              return (
                <button key={d}
                  onClick={() => {
                    if (selectedSlot !== null) { const n = [...noteSlots]; n[selectedSlot] = d; setNoteSlots(n); setSelectedSlot(null); }
                    else { const idx = noteSlots.findIndex(s => s === ""); if (idx !== -1) { const n = [...noteSlots]; n[idx] = d; setNoteSlots(n); } }
                  }}
                  className={`w-7 h-7 rounded text-xs font-bold font-mono cursor-pointer transition-all border ${
                    inSlot ? "bg-success/20 text-success border-success/40"
                    : s === "eliminated" ? "bg-danger/10 text-danger/50 border-danger/20 line-through"
                    : s === "exists" ? "bg-cow/15 text-cow border-cow/30"
                    : "bg-bg-elevated text-text-muted border-border"
                  }`}>{d}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input or done */}
      {phase === "play" && (
        <div className="bg-bg-card border border-accent/20 rounded-xl p-3">
          <div className="flex items-center gap-2 justify-center">
            {digits.map((d, i) => (
              <input key={i} type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) document.querySelectorAll<HTMLInputElement>(".tut-input")[i-1]?.focus();
                  if (e.key === "Enter" && isValid) submitGuess();
                }}
                className="tut-input w-11 h-12 bg-bg-elevated border-2 border-border rounded-lg text-center font-mono text-xl font-bold text-text focus:border-accent focus:outline-none"
                placeholder="·" />
            ))}
            <button onClick={submitGuess} disabled={!isValid}
              className="px-4 py-3 bg-accent text-bg font-semibold rounded-lg hover:brightness-110 disabled:opacity-30 cursor-pointer text-sm">
              Guess
            </button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-success/10 border border-success/20 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-success mb-1">You got it!</h2>
          <p className="text-text-muted text-sm mb-4">Cracked in {guesses.length} guesses. You{"'"}re ready to play!</p>
          <div className="flex gap-3">
            <button onClick={() => { setPhase("play"); setGuesses([]); setTip(""); setNoteSlots(["","","",""]); }}
              className="flex-1 py-3 bg-bg-elevated border border-border text-text font-medium rounded-xl cursor-pointer hover:bg-bg-hover">
              Try Again
            </button>
            <Link href="/login" className="flex-1">
              <button className="w-full py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 cursor-pointer">
                Play Real Game
              </button>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
