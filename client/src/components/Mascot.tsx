"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RightSword } from "@/components/SwordIcon";

// "Digit Warrior" mascot — a number personified as a fighter (the glyph IS the body).
// Prefers a real sprite at /art/mascot-<mood>.png; falls back to a code-drawn digit warrior.

type Mood = "idle" | "win" | "lose";

function DigitWarrior({ digit = "7", size }: { digit?: string; size: number }) {
  const eyeW = Math.round(size * 0.09);
  const eyeH = Math.round(size * 0.11);
  const pupil = Math.round(size * 0.04);
  const browH = Math.max(2, Math.round(size * 0.022));
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* sword, held to the side */}
      <span className="absolute" style={{ width: size * 0.46, height: size * 0.46, bottom: "4%", right: "0%", transform: "rotate(-8deg)" }}>
        <RightSword className="w-full h-full" />
      </span>
      {/* the digit = the body */}
      <span
        className="font-pixel relative"
        style={{
          fontSize: size * 0.64,
          lineHeight: 1,
          color: "#c2916a",
          textShadow: `0 ${Math.round(size * 0.035)}px 0 #5a3f28, 0 0 ${Math.round(size * 0.16)}px #c2916a77`,
        }}
      >
        {digit}
      </span>
      {/* fierce-but-cute face */}
      <div className="absolute flex items-end" style={{ top: "29%", gap: size * 0.05 }}>
        {[0, 1].map((i) => (
          <span key={i} className="flex flex-col items-center" style={{ gap: Math.round(size * 0.01) }}>
            {/* angry brow (tilts toward center) */}
            <span style={{ width: eyeW * 1.15, height: browH, background: "#241812", borderRadius: 1, transform: `rotate(${i === 0 ? 14 : -14}deg)` }} />
            {/* eye */}
            <span style={{ width: eyeW, height: eyeH, background: "#eef6ec", borderRadius: 2, position: "relative", boxShadow: "0 0 5px #8fe0a066" }}>
              {/* green iris + pupil */}
              <span style={{ position: "absolute", width: pupil, height: pupil, background: "#3aa564", borderRadius: 1, bottom: "16%", left: i === 0 ? "40%" : "20%" }} />
              {/* glint */}
              <span style={{ position: "absolute", width: Math.max(1, Math.round(size * 0.015)), height: Math.max(1, Math.round(size * 0.015)), background: "#ffffff", top: "14%", left: "20%" }} />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Mascot({ size = 96, mood = "idle", className = "", digit = "7" }: { size?: number; mood?: Mood; className?: string; digit?: string }) {
  const [hasSprite, setHasSprite] = useState(true);

  return (
    <motion.div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 45%, #c2916a30 0%, transparent 62%)" }} />
      {hasSprite ? (
        <div className="relative w-full h-full rounded-2xl overflow-hidden"
          style={{ border: "2px solid #c2916a66", boxShadow: "inset 0 1px 0 #ffffff22, 0 8px 22px -8px #000000aa" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/art/mascot-${mood}.png`}
            alt="DigitDuel mascot"
            className="w-full h-full object-cover"
            style={{ imageRendering: "pixelated" }}
            onError={() => setHasSprite(false)}
          />
        </div>
      ) : (
        <DigitWarrior digit={digit} size={size} />
      )}
    </motion.div>
  );
}
