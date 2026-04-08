"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";

const STEPS = [
  {
    title: "Pick a Secret",
    desc: "Choose a 4-digit number with all different digits. Your opponent will try to guess it.",
    visual: (
      <div className="flex gap-2 justify-center">
        {["5", "2", "7", "1"].map((d, i) => (
          <motion.div key={i} initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: i * 0.15 }}
            className="w-12 h-14 bg-accent/20 border-2 border-accent/40 rounded-lg flex items-center justify-center font-mono text-xl font-bold text-accent">{d}</motion.div>
        ))}
      </div>
    ),
  },
  {
    title: "Guess & Get Clues",
    desc: "Each turn you guess 4 digits. You get colored clues back:",
    visual: (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full bg-bull shrink-0" />
          <span className="text-sm"><strong className="text-bull">Filled dot</strong> — right digit, right spot</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full border-2 border-cow shrink-0" />
          <span className="text-sm"><strong className="text-cow">Hollow dot</strong> — right digit, wrong spot</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full bg-bg-hover shrink-0" />
          <span className="text-sm"><strong className="text-text-dim">Grey dot</strong> — digit not in the number</span>
        </div>
      </div>
    ),
  },
  {
    title: "Example",
    desc: "If the secret is 5271 and you guess 1234:",
    visual: (
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 justify-center">
          {[
            { d: "1", color: "bg-cow/20 text-cow border-cow/30", label: "wrong spot" },
            { d: "2", color: "bg-bull/20 text-bull border-bull/30", label: "right!" },
            { d: "3", color: "bg-bg-elevated text-text-dim border-border", label: "nope" },
            { d: "4", color: "bg-bg-elevated text-text-dim border-border", label: "nope" },
          ].map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                className={`w-10 h-11 border-2 rounded-lg flex items-center justify-center font-mono text-lg font-bold ${c.color}`}>{c.d}</motion.div>
              <span className={`text-[9px] ${c.color.includes("bull") ? "text-bull" : c.color.includes("cow") ? "text-cow" : "text-text-dim"}`}>{c.label}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1 ml-2">
            <div className="flex gap-1 h-11 items-center">
              <span className="w-3.5 h-3.5 rounded-full bg-bull" />
              <span className="w-3.5 h-3.5 rounded-full border-2 border-cow" />
              <span className="w-3.5 h-3.5 rounded-full bg-bg-hover" />
              <span className="w-3.5 h-3.5 rounded-full bg-bg-hover" />
            </div>
            <span className="text-[9px] text-text-dim">clues</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Use the Notepad",
    desc: "Track your findings! Click a slot, then tap a digit to place it. Eliminated digits turn red automatically.",
    visual: (
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {["5", "", "7", ""].map((d, i) => (
            <div key={i} className={`w-10 h-11 rounded-lg border-2 flex items-center justify-center font-mono text-lg font-bold ${
              d ? "border-success/50 bg-success/10 text-success" : "border-border border-dashed text-text-dim"
            }`}>{d || <span className="text-xs opacity-50">{i + 1}</span>}</div>
          ))}
        </div>
        <p className="text-[10px] text-text-dim">Slots 1 and 3 figured out!</p>
      </div>
    ),
  },
];

export default function HowToPlayPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { data: session } = useSession();
  const { socket } = useSocket();

  const startTutorialGame = () => {
    if (socket) {
      socket.emit("client:game:start-ai", { difficulty: "easy" });
      const handler = (data: { gameId: string }) => {
        router.push(`/game/${data.gameId}?tutorial=1`);
        socket.off("server:game:state", handler);
      };
      socket.on("server:game:state", handler);
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-bull/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-cow/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <Link href={session ? "/lobby" : "/"} className="text-text-dim text-sm hover:text-text-muted cursor-pointer">← Back</Link>
          <h1 className="text-xl font-bold"><span className="text-bull">How</span> to <span className="text-cow">Play</span></h1>
          <div className="w-12" />
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 mb-6 justify-center">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${i === step ? "w-8 bg-accent" : "w-3 bg-border"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="text-center mb-5">
              <div className="text-xs text-accent font-medium mb-1">{step + 1} / {STEPS.length}</div>
              <h2 className="text-2xl font-bold mb-2">{STEPS[step].title}</h2>
              <p className="text-text-muted text-sm">{STEPS[step].desc}</p>
            </div>

            <div className="bg-bg-card border border-border rounded-2xl p-5 mb-6">
              {STEPS[step].visual}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
            className="flex-1 py-3 bg-bg-elevated border border-border text-text font-medium rounded-xl disabled:opacity-30 cursor-pointer hover:bg-bg-hover">
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)}
              className="flex-1 py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 cursor-pointer active:scale-[0.98]">
              Next
            </button>
          ) : (
            <button onClick={startTutorialGame}
              className="flex-1 py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 cursor-pointer active:scale-[0.98]">
              Practice Game →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
