"use client";

import { motion } from "framer-motion";

// Lively pixel-game ambiance shared across the in-app screens: drifting clouds,
// rising particles, and a layered pixel-mountain horizon. Fixed + behind content.
// Static config (no Math.random) to avoid SSR hydration mismatches.

const CLOUDS = [
  { top: "5vh", left: "18vw", dur: 46, shapes: [3, 5, 4], op: 0.06 },
  { top: "9vh", left: "55vw", dur: 60, shapes: [2, 4, 3], op: 0.05 },
  { top: "7vh", left: "36vw", dur: 52, shapes: [2.5, 4, 2, 3], op: 0.05 },
  { top: "13vh", left: "8vw", dur: 70, shapes: [3, 4, 5, 3], op: 0.04 },
  { top: "6vh", left: "72vw", dur: 50, shapes: [2, 3, 2], op: 0.05 },
  { top: "16vh", left: "46vw", dur: 64, shapes: [4, 6, 4, 3], op: 0.035 },
];

const PARTICLES = [
  { left: "12%", dur: 14, delay: 0, size: 3 },
  { left: "26%", dur: 18, delay: 3, size: 2 },
  { left: "38%", dur: 16, delay: 6, size: 4 },
  { left: "51%", dur: 20, delay: 1.5, size: 2 },
  { left: "63%", dur: 15, delay: 4.5, size: 3 },
  { left: "74%", dur: 19, delay: 2, size: 2 },
  { left: "85%", dur: 17, delay: 7, size: 3 },
  { left: "92%", dur: 22, delay: 5, size: 2 },
];

const STARS = [
  { top: "8%", left: "14%", dur: 3.2, delay: 0, size: 2 },
  { top: "12%", left: "30%", dur: 4.1, delay: 1.2, size: 2 },
  { top: "6%", left: "47%", dur: 2.8, delay: 0.6, size: 3 },
  { top: "15%", left: "62%", dur: 3.6, delay: 2, size: 2 },
  { top: "9%", left: "78%", dur: 4.4, delay: 0.3, size: 2 },
  { top: "18%", left: "88%", dur: 3.0, delay: 1.6, size: 3 },
  { top: "22%", left: "22%", dur: 3.8, delay: 2.4, size: 2 },
  { top: "20%", left: "70%", dur: 2.6, delay: 0.9, size: 2 },
  { top: "5%", left: "58%", dur: 4.0, delay: 1.8, size: 2 },
  { top: "25%", left: "40%", dur: 3.4, delay: 0.4, size: 2 },
];

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* Twinkling stars */}
      {STARS.map((s, i) => (
        <span key={`star-${i}`} className="absolute"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, background: "var(--color-text)", animation: `twinkle ${s.dur}s ease-in-out infinite`, animationDelay: `${s.delay}s` }} />
      ))}

      {/* Drifting pixel clouds */}
      {CLOUDS.map((c, i) => (
        <motion.div key={`cloud-${i}`} className="absolute" style={{ top: c.top, left: c.left, opacity: c.op }}
          animate={{ x: ["0vw", "115vw"], y: [0, -2, 0, 2, 0] }}
          transition={{ x: { duration: c.dur, repeat: Infinity, ease: "linear" }, y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" } }}
        >
          <div className="flex items-end gap-px">
            {c.shapes.map((w, j) => (
              <div key={j} className="bg-white" style={{ width: `${w * 4}px`, height: `${(w * 0.6 + 1) * 4}px` }} />
            ))}
          </div>
        </motion.div>
      ))}

      {/* Rising ember/pixel particles */}
      {PARTICLES.map((p, i) => (
        <motion.div key={`p-${i}`} className="absolute bottom-[12vh]"
          style={{ left: p.left, width: p.size, height: p.size, background: "var(--color-accent)", opacity: 0 }}
          animate={{ y: ["0vh", "-70vh"], x: [0, 8, -6, 4, 0], opacity: [0, 0.5, 0.5, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Pixel mountain horizon — 3 layers */}
      <div className="absolute bottom-0 left-0 right-0 h-[26vh]">
        <div className="absolute inset-0" style={{
          background: "#241f1a",
          clipPath: `polygon(0% 100%, 0% 55%, 3% 55%, 3% 48%, 7% 48%, 7% 42%, 11% 42%, 11% 36%, 15% 36%, 15% 32%, 19% 32%, 19% 26%, 24% 26%, 24% 22%, 30% 22%, 30% 26%, 34% 26%, 34% 32%, 38% 32%, 38% 44%, 42% 44%, 42% 55%, 46% 55%, 46% 50%, 50% 50%, 50% 55%, 54% 55%, 54% 50%, 58% 50%, 58% 44%, 60% 44%, 60% 32%, 64% 32%, 64% 22%, 66% 26%, 66% 22%, 72% 22%, 72% 26%, 76% 22%, 76% 30%, 80% 30%, 80% 36%, 84% 36%, 84% 42%, 88% 42%, 88% 55%, 100% 55%, 100% 100%)`,
        }} />
        <div className="absolute inset-0" style={{
          background: "#1f1b16",
          clipPath: `polygon(0% 100%, 0% 72%, 4% 72%, 4% 65%, 8% 65%, 8% 58%, 14% 58%, 14% 65%, 18% 65%, 18% 72%, 24% 72%, 24% 68%, 30% 68%, 30% 72%, 36% 72%, 36% 62%, 40% 62%, 40% 68%, 46% 68%, 46% 75%, 54% 75%, 54% 68%, 60% 68%, 60% 62%, 64% 62%, 64% 72%, 70% 72%, 70% 68%, 76% 68%, 76% 72%, 82% 72%, 82% 65%, 86% 65%, 86% 58%, 92% 58%, 92% 65%, 96% 65%, 96% 72%, 100% 72%, 100% 100%)`,
        }} />
        <div className="absolute inset-0" style={{
          background: "#2a241d",
          clipPath: `polygon(0% 100%, 0% 85%, 5% 85%, 5% 80%, 10% 80%, 10% 85%, 16% 85%, 16% 78%, 22% 78%, 22% 85%, 30% 85%, 30% 82%, 36% 82%, 36% 85%, 44% 85%, 44% 80%, 50% 80%, 50% 85%, 56% 85%, 56% 82%, 64% 82%, 64% 85%, 70% 85%, 70% 78%, 78% 78%, 78% 85%, 84% 85%, 84% 80%, 90% 80%, 90% 85%, 95% 85%, 95% 82%, 100% 82%, 100% 100%)`,
        }} />
      </div>
    </div>
  );
}
