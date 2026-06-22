"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#6ee7a0", "#f0d45b", "#c2916a", "#f07070", "#7db8ff", "#e0a3ff"];

// Celebratory confetti burst for the win screen. Pure framer-motion, no deps/assets.
export function Confetti({ count = 80 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.8 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 160,
        rotate: Math.random() * 720 - 360,
        size: 6 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
      })),
    [count],
  );

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -40, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", x: p.drift, opacity: [1, 1, 0.9, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
