"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const STEPS = [
  {
    title: "The Secret",
    desc: "Each player picks a 4-digit secret number. All digits must be different.",
    example: { secret: "5271", guess: null, bulls: 0, cows: 0 },
  },
  {
    title: "Make a Guess",
    desc: "Take turns guessing your opponent's secret. You have 60 seconds per turn.",
    example: { secret: "5271", guess: "1234", bulls: 1, cows: 1 },
  },
  {
    title: "Read the Clues",
    desc: "After each guess you get clues. Filled dots = right digit, right spot. Hollow dots = right digit, wrong spot.",
    example: { secret: "5271", guess: "1234", bulls: 1, cows: 1 },
    detail: [
      { d: "1", status: "cow", reason: "1 is in the secret, but not in position 1" },
      { d: "2", status: "bull", reason: "2 is in position 2 — correct!" },
      { d: "3", status: "miss", reason: "3 is not in the secret" },
      { d: "4", status: "miss", reason: "4 is not in the secret" },
    ],
  },
  {
    title: "Narrow It Down",
    desc: "Use the clues to eliminate possibilities. The Notepad helps you track what you know.",
    example: { secret: "5271", guess: "5278", bulls: 3, cows: 0 },
    detail: [
      { d: "5", status: "bull", reason: "Correct!" },
      { d: "2", status: "bull", reason: "Correct!" },
      { d: "7", status: "bull", reason: "Correct!" },
      { d: "8", status: "miss", reason: "Not in the secret" },
    ],
  },
  {
    title: "Crack It!",
    desc: "4 filled dots means you cracked the code! Whoever cracks it first (or in fewer rounds) wins.",
    example: { secret: "5271", guess: "5271", bulls: 4, cows: 0 },
  },
];

function PegDots({ bulls, cows }: { bulls: number; cows: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: bulls }).map((_, i) => (
        <span key={`b${i}`} className="w-3 h-3 rounded-full bg-bull inline-block" />
      ))}
      {Array.from({ length: cows }).map((_, i) => (
        <span key={`c${i}`} className="w-3 h-3 rounded-full border-2 border-cow inline-block" />
      ))}
      {Array.from({ length: 4 - bulls - cows }).map((_, i) => (
        <span key={`m${i}`} className="w-3 h-3 rounded-full bg-bg-hover inline-block" />
      ))}
    </div>
  );
}

export default function HowToPlayPage() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-bull/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-cow/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-text-dim text-sm hover:text-text-muted cursor-pointer">
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold">
            <span className="text-bull">How</span> to <span className="text-cow">Play</span>
          </h1>
          <Link href="/login" className="text-accent text-sm font-medium hover:underline cursor-pointer">
            Play
          </Link>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-6 justify-center">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === step ? "w-8 bg-accent" : "w-3 bg-border hover:bg-border-light"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-center mb-6">
              <div className="text-sm text-accent font-medium mb-1">Step {step + 1} of {STEPS.length}</div>
              <h2 className="text-2xl font-bold mb-2">{current.title}</h2>
              <p className="text-text-muted text-sm">{current.desc}</p>
            </div>

            {/* Visual example */}
            <div className="bg-bg-card border border-border rounded-2xl p-5 mb-6">
              {/* Secret display */}
              {step === 0 && (
                <div className="text-center">
                  <div className="text-xs text-text-dim mb-3">Your opponent picks a secret:</div>
                  <div className="flex gap-2 justify-center">
                    {current.example.secret.split("").map((d, i) => (
                      <motion.div
                        key={i}
                        initial={{ rotateY: 180 }}
                        animate={{ rotateY: 0 }}
                        transition={{ delay: i * 0.15, duration: 0.4 }}
                        className="w-12 h-14 bg-accent/15 border-2 border-accent/30 rounded-lg flex items-center justify-center font-mono text-xl font-bold text-accent"
                      >
                        {d}
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-dim mt-3">You don&apos;t see this — you have to guess it!</p>
                </div>
              )}

              {/* Guess with result */}
              {current.example.guess && (
                <div>
                  <div className="text-xs text-text-dim mb-2">Secret: <span className="font-mono text-text-muted">????</span></div>
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] text-text-dim">Guess:</div>
                    <div className="flex gap-1.5">
                      {current.example.guess.split("").map((d, i) => {
                        const detail = current.detail?.[i];
                        const bg = detail
                          ? detail.status === "bull" ? "bg-bull/20 border-bull/40 text-bull"
                          : detail.status === "cow" ? "bg-cow/20 border-cow/40 text-cow"
                          : "bg-bg-elevated border-border text-text-dim"
                          : "bg-bg-elevated border-border text-text";
                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className={`w-10 h-11 border-2 rounded-lg flex items-center justify-center font-mono text-lg font-bold ${bg}`}
                          >
                            {d}
                          </motion.div>
                        );
                      })}
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <PegDots bulls={current.example.bulls} cows={current.example.cows} />
                    </motion.div>
                  </div>

                  {/* Detailed breakdown */}
                  {current.detail && (
                    <div className="mt-4 space-y-1.5">
                      {current.detail.map((d, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.1 }}
                          className="flex items-center gap-2 text-[11px]"
                        >
                          <span className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs ${
                            d.status === "bull" ? "bg-bull/20 text-bull"
                            : d.status === "cow" ? "bg-cow/20 text-cow"
                            : "bg-bg-elevated text-text-dim"
                          }`}>{d.d}</span>
                          <span className={`${
                            d.status === "bull" ? "text-bull" : d.status === "cow" ? "text-cow" : "text-text-dim"
                          }`}>{d.reason}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Win state */}
                  {current.example.bulls === 4 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="mt-4 text-center py-3 bg-success/10 border border-success/20 rounded-xl"
                    >
                      <div className="text-success font-bold">4 filled dots = You win!</div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex-1 py-3 bg-bg-elevated border border-border text-text font-medium rounded-xl hover:bg-bg-hover disabled:opacity-30 cursor-pointer transition-all"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 cursor-pointer transition-all active:scale-[0.98]"
            >
              Next
            </button>
          ) : (
            <Link href="/login" className="flex-1">
              <button className="w-full py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 cursor-pointer transition-all active:scale-[0.98]">
                Start Playing
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
