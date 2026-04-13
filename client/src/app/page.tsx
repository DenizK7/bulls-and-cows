"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { BrandTitle } from "@/components/BrandTitle";
import { LeftSword, RightSword } from "@/components/SwordIcon";

const DEMO_GUESSES = [
  { guess: "1234", bulls: 0, cows: 2, delay: 0 },
  { guess: "5678", bulls: 1, cows: 1, delay: 0.15 },
  { guess: "5291", bulls: 2, cows: 1, delay: 0.3 },
  { guess: "5271", bulls: 4, cows: 0, delay: 0.45 },
];

function DigitCard({
  digit,
  type,
  delay,
}: {
  digit: string;
  type: "bull" | "cow" | "miss";
  delay: number;
}) {
  const bg =
    type === "bull"
      ? "bg-bull/20 border-bull text-bull"
      : type === "cow"
        ? "bg-cow/20 border-cow text-cow"
        : "bg-bg-elevated border-border text-text-muted";

  return (
    <motion.div
      initial={{ rotateX: 90, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={`w-9 h-10 sm:w-10 sm:h-11 rounded-sm border-2 ${bg} flex items-center justify-center font-pixel-mono text-base sm:text-lg`}
    >
      {digit}
    </motion.div>
  );
}

function DemoRow({
  guess,
  bulls,
  cows,
  delay,
}: {
  guess: string;
  bulls: number;
  cows: number;
  delay: number;
}) {
  const secret = "5271";
  const types = guess.split("").map((d, i) => {
    if (d === secret[i]) return "bull" as const;
    if (secret.includes(d)) return "cow" as const;
    return "miss" as const;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-1.5 sm:gap-2"
    >
      <div className="flex gap-1">
        {guess.split("").map((digit, i) => (
          <DigitCard
            key={i}
            digit={digit}
            type={types[i]}
            delay={delay + 0.1 * i}
          />
        ))}
      </div>
      <div className="flex gap-1 ml-2 min-w-[60px]">
        {bulls > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.5, type: "spring" }}
            className="text-bull font-pixel-mono font-bold text-sm"
          >
            {bulls}B
          </motion.span>
        )}
        {cows > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.6, type: "spring" }}
            className="text-cow font-pixel-mono font-bold text-sm"
          >
            {cows}C
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}


export default function Home() {
  const { t } = useT();
  const router = useRouter();
  const [attacking, setAttacking] = useState(false);
  const [flash, setFlash] = useState(false);

  const handlePlay = () => {
    if (attacking) return;
    setAttacking(true);
    setTimeout(() => setFlash(true), 600);
    setTimeout(() => router.push("/login"), 1800);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-hidden gap-4 sm:gap-5" style={{ marginTop: "-8vh" }}>
      {/* Pixel art sun — centered within its own box for clean alignment */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-6 w-20 h-20 sm:w-28 sm:h-28 pointer-events-none z-0">
        {/* Glow halo */}
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #c2916a22 0%, #c2916a10 40%, transparent 70%)" }} />
        {/* Sun body */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-sm bg-[#c2916a] opacity-30" />
        {/* 4 directional rays — centered on sun */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 sm:w-1.5 h-3 sm:h-4 bg-[#c2916a] opacity-20" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 sm:w-1.5 h-3 sm:h-4 bg-[#c2916a] opacity-20" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-3 sm:w-4 h-1 sm:h-1.5 bg-[#c2916a] opacity-20" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-3 sm:w-4 h-1 sm:h-1.5 bg-[#c2916a] opacity-20" />
        {/* 4 diagonal ray dots */}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#c2916a] opacity-12" />
        <div className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#c2916a] opacity-12" />
        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#c2916a] opacity-12" />
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#c2916a] opacity-12" />
      </div>

      {/* Crescent moon — top-right, same height as sun, facing LEFT */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 w-20 h-20 sm:w-28 sm:h-28 pointer-events-none z-0 flex items-center justify-center">
        <div className="relative w-10 h-10 sm:w-12 sm:h-12">
          <div className="absolute inset-0 rounded-full bg-[#ede5d8] opacity-20" />
          {/* Cutout on LEFT side to make crescent face left */}
          <div className="absolute top-0 w-full h-full rounded-full bg-[#12100e]" style={{ left: "-35%" }} />
        </div>
        {/* Glow */}
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #ede5d808 0%, transparent 50%)" }} />
      </div>

      {/* Pixel clouds — 6 clouds drifting right, different speeds/heights */}
      {[
        { top: "3vh", left: "20vw", dur: 38, shapes: [3, 5, 4], op: 0.06 },
        { top: "7vh", left: "55vw", dur: 52, shapes: [2, 4, 3], op: 0.04 },
        { top: "5vh", left: "35vw", dur: 45, shapes: [2.5, 4, 2, 3], op: 0.05 },
        { top: "9vh", left: "10vw", dur: 60, shapes: [3, 4, 5, 3], op: 0.04 },
        { top: "4vh", left: "70vw", dur: 42, shapes: [2, 3, 2], op: 0.05 },
        { top: "11vh", left: "45vw", dur: 55, shapes: [4, 6, 4, 3], op: 0.03 },
      ].map((c, i) => (
        <motion.div key={i} className="fixed pointer-events-none z-0"
          style={{ top: c.top, left: c.left, opacity: c.op }}
          animate={{ x: ["0vw", "110vw"], y: [0, -2, 0, 2, 0] }}
          transition={{ x: { duration: c.dur, repeat: Infinity, ease: "linear" }, y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" } }}
        >
          <div className="flex items-end gap-px">
            {c.shapes.map((w, j) => (
              <div key={j} className="bg-white" style={{ width: `${w * 4}px`, height: `${(w * 0.6 + 1) * 4}px` }} />
            ))}
          </div>
        </motion.div>
      ))}

      <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-6 max-w-lg w-full">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <BrandTitle size="lg" animate />
          <motion.p className="font-pixel text-[8px] sm:text-[10px] text-text-muted mt-3 tracking-wide"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5, duration: 0.5 }}>
            {t("landing.title.crack")} {t("landing.title.challenge")}
          </motion.p>
        </motion.div>

        {/* Demo Game Board — pixel styled */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 3.8, duration: 0.5 }}
          className="glass-card rounded-sm p-3 sm:p-4 w-full border border-border"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-muted text-[10px] font-pixel uppercase">Demo</span>
            <span className="text-text-dim text-[10px] font-pixel">????</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {DEMO_GUESSES.map((g) => (
              <DemoRow key={g.guess} {...g} />
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="mt-2 pt-2 border-t border-border flex items-center justify-between"
          >
            <span className="text-success font-pixel text-[9px]">4 guesses!</span>
            <span className="font-pixel text-text-muted text-[9px]">= <span className="text-accent">5271</span></span>
          </motion.div>
        </motion.div>

        {/* Stats teaser — ABOVE the battle CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.2 }}
          className="flex gap-5 sm:gap-6 text-center font-pixel"
        >
          <div>
            <div className="text-lg sm:text-xl text-text">1v1</div>
            <div className="text-text-dim text-[7px] sm:text-[8px]">{t("landing.realTime")}</div>
          </div>
          <div className="w-px bg-border" />
          <div>
            <div className="text-lg sm:text-xl text-text">AI</div>
            <div className="text-text-dim text-[7px] sm:text-[8px]">{t("landing.difficulties")}</div>
          </div>
          <div className="w-px bg-border" />
          <div>
            <div className="text-lg sm:text-xl text-text">ELO</div>
            <div className="text-text-dim text-[7px] sm:text-[8px]">{t("landing.ranked")}</div>
          </div>
        </motion.div>

      </div>

      {/* Battle CTA — warriors swing swords on click, button explodes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4.5, duration: 0.4 }}
        className="flex items-end justify-center gap-0 w-full max-w-sm mx-auto relative z-10"
      >
        {/* Left warrior — lunges right on attack */}
        <motion.div
          className={`flex items-end shrink-0 ${attacking ? "" : "animate-float"}`}
          animate={attacking ? { x: 25, rotate: 20, scale: 1.1 } : {}}
          transition={{ duration: 0.35, ease: [0.2, 0, 0.4, 1] }}
        >
          <span className="font-pixel text-2xl sm:text-3xl text-cow leading-none">3</span>
          <LeftSword className="w-7 h-7 sm:w-9 sm:h-9 -ml-0.5 -mr-0.5" />
        </motion.div>

        {/* Oyna button — explodes on click */}
        <motion.button
          onClick={handlePlay}
          className="px-6 sm:px-10 py-2.5 sm:py-3 font-pixel text-[9px] sm:text-xs text-[#ede5d8] cursor-pointer border-2 border-[#5a5045] shrink-0"
          style={{
            background: "linear-gradient(180deg, #5a5045 0%, #45403a 40%, #3a352f 100%)",
            clipPath: "polygon(5px 0, calc(100% - 3px) 0, 100% 5px, 100% calc(100% - 7px), calc(100% - 6px) 100%, 4px 100%, 0 calc(100% - 4px), 0 7px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 6px rgba(0,0,0,0.5)"
          }}
          animate={attacking ? { scale: [1, 1.2, 1.3, 0], opacity: [1, 1, 0.8, 0] } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut", times: [0, 0.3, 0.7, 1] }}
        >
          {t("landing.playNow")}
        </motion.button>

        {/* Right warrior — lunges left on attack */}
        <motion.div
          className={`flex items-end shrink-0 ${attacking ? "" : "animate-float"}`}
          animate={attacking ? { x: -25, rotate: -20, scale: 1.1 } : {}}
          transition={{ duration: 0.35, ease: [0.2, 0, 0.4, 1] }}
        >
          <RightSword className="w-7 h-7 sm:w-9 sm:h-9 -ml-0.5 -mr-0.5" />
          <span className="font-pixel text-2xl sm:text-3xl text-cow leading-none">7</span>
        </motion.div>
      </motion.div>

      {/* Full-screen flash — explodes outward from button, then reverses */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 100, background: "#c2916a" }}
        initial={{ opacity: 0 }}
        animate={flash ? { opacity: [0, 0.9, 1, 0] } : { opacity: 0 }}
        transition={{ duration: 1, times: [0, 0.2, 0.5, 1], ease: "easeInOut" }}
      />

      {/* Mountains — 3 layers: back peaks + mid hills + front bumps */}
      <div className="fixed bottom-0 left-0 right-0 h-[30vh] pointer-events-none" style={{ zIndex: 0 }}>
        {/* Back — main two peaks (darkest) */}
        <div className="absolute inset-0" style={{
          background: "#2a2520",
          clipPath: `polygon(
            0% 100%,
            0% 55%, 3% 55%, 3% 48%, 7% 48%, 7% 42%, 11% 42%, 11% 36%,
            15% 36%, 15% 30%, 19% 30%, 19% 22%, 24% 22%, 24% 15%,
            30% 15%, 30% 22%, 34% 22%, 34% 32%, 38% 32%, 38% 44%,
            42% 44%, 42% 55%, 46% 55%, 46% 50%, 50% 50%, 50% 55%,
            54% 55%, 54% 50%, 58% 50%, 58% 55%,
            58% 55%, 58% 44%, 60% 44%, 60% 32%, 64% 32%, 64% 22%,
            66% 22%, 66% 15%, 72% 15%, 72% 22%, 76% 22%, 76% 30%,
            80% 30%, 80% 36%, 84% 36%, 84% 42%, 88% 42%, 88% 55%,
            100% 55%, 100% 100%
          )`
        }} />
        {/* Mid — smaller hills, medium tone */}
        <div className="absolute inset-0" style={{
          background: "#24201a",
          clipPath: `polygon(
            0% 100%,
            0% 72%, 4% 72%, 4% 65%, 8% 65%, 8% 58%, 14% 58%, 14% 65%,
            18% 65%, 18% 72%, 24% 72%, 24% 68%, 30% 68%, 30% 72%,
            36% 72%, 36% 62%, 40% 62%, 40% 68%, 46% 68%, 46% 75%,
            54% 75%, 54% 68%, 60% 68%, 60% 62%, 64% 62%, 64% 72%,
            70% 72%, 70% 68%, 76% 68%, 76% 72%,
            82% 72%, 82% 65%, 86% 65%, 86% 58%, 92% 58%, 92% 65%,
            96% 65%, 96% 72%, 100% 72%, 100% 100%
          )`
        }} />
        {/* Front — ground bumps, lightest */}
        <div className="absolute inset-0" style={{
          background: "#2e2820",
          clipPath: `polygon(
            0% 100%,
            0% 85%, 5% 85%, 5% 80%, 10% 80%, 10% 85%, 16% 85%, 16% 78%,
            22% 78%, 22% 85%, 30% 85%, 30% 82%, 36% 82%, 36% 85%,
            44% 85%, 44% 80%, 50% 80%, 50% 85%, 56% 85%, 56% 82%,
            64% 82%, 64% 85%, 70% 85%, 70% 78%, 78% 78%, 78% 85%,
            84% 85%, 84% 80%, 90% 80%, 90% 85%, 95% 85%, 95% 82%,
            100% 82%, 100% 100%
          )`
        }} />
      </div>
    </div>
  );
}
