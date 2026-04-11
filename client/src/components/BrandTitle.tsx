"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CrossedSwords } from "./SwordIcon";

type Size = "sm" | "md" | "lg";

const SIZE_CONFIG: Record<Size, {
  text: string;
  swordCls: string;
  containerGap: string;
  sparkCount: number;
  sparkRadius: number;
  sparkFont: string;
}> = {
  sm: {
    text: "text-[11px]",
    swordCls: "w-6 h-6",
    containerGap: "gap-1.5",
    sparkCount: 3,
    sparkRadius: 11,
    sparkFont: "text-[6px]",
  },
  md: {
    text: "text-base",
    swordCls: "w-9 h-9",
    containerGap: "gap-2.5",
    sparkCount: 4,
    sparkRadius: 18,
    sparkFont: "text-[8px]",
  },
  lg: {
    text: "text-2xl sm:text-3xl",
    swordCls: "w-14 h-14 sm:w-16 sm:h-16",
    containerGap: "gap-3",
    sparkCount: 5,
    sparkRadius: 28,
    sparkFont: "text-[9px] sm:text-[10px]",
  },
};

const SPARK_COLORS = ["#e8a94a", "#f2d55c", "#d97a5b", "#8fb65a", "#4d9d8f"];

interface Spark {
  digit: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
  scale: number;
}

// Digits dripping from the lower-left and lower-right of the crossed swords.
// First two anchor at the sword's lower corners, the rest trail downward beneath them.
// Positions are normalized; multiplied by `radius` per size.
const DRIP_POSITIONS = [
  { nx: -0.70, ny: 0.55 },  // 1: sword lower-left
  { nx: 0.70, ny: 0.55 },   // 2: sword lower-right
  { nx: -0.50, ny: 0.85 },  // 3: trailing left
  { nx: 0.50, ny: 0.85 },   // 4: trailing right
  { nx: 0.0, ny: 1.0 },     // 5: center, deepest
];

function makeSparks(count: number, radius: number): Spark[] {
  return DRIP_POSITIONS.slice(0, count).map((p, i) => ({
    digit: String((i * 7 + 3) % 10),
    x: p.nx * radius,
    y: p.ny * radius,
    color: SPARK_COLORS[i % SPARK_COLORS.length],
    opacity: 0.75 - i * 0.06,
    scale: 1 - i * 0.05,
  }));
}

const SPARKS_SM = makeSparks(SIZE_CONFIG.sm.sparkCount, SIZE_CONFIG.sm.sparkRadius);
const SPARKS_MD = makeSparks(SIZE_CONFIG.md.sparkCount, SIZE_CONFIG.md.sparkRadius);
const SPARKS_LG = makeSparks(SIZE_CONFIG.lg.sparkCount, SIZE_CONFIG.lg.sparkRadius);

export function BrandTitle({ size = "md", animate = false }: { size?: Size; animate?: boolean }) {
  const cfg = SIZE_CONFIG[size];
  const sparks = size === "sm" ? SPARKS_SM : size === "md" ? SPARKS_MD : SPARKS_LG;

  // Defer sparks to client-only render to avoid SSR/hydration mismatches
  // (sparks are decoration, the SSR HTML doesn't need them)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Animation timings — only used when `animate` is true (landing page)
  // Sparks appear AFTER the clash flash (~0.65s)
  const sparkBaseDelay = animate ? 0.7 : 0;
  const sparkDuration = animate ? 0.4 : 0;

  return (
    <h1 className={`font-pixel ${cfg.text} flex items-center justify-center ${cfg.containerGap} relative leading-none`}>
      <span className="text-bull">Digit</span>
      <span className="relative inline-block">
        <CrossedSwords className={cfg.swordCls} animate={animate} />
        {/* Pixel digit sparks frozen mid-flight — client-only to avoid hydration issues */}
        {mounted && sparks.map((s, i) => (
          <motion.span
            key={i}
            className={`font-pixel ${cfg.sparkFont} absolute pointer-events-none select-none`}
            style={{
              left: "50%",
              top: "50%",
              color: s.color,
            }}
            initial={animate ? { x: 0, y: 0, opacity: 0, scale: 0 } : { x: s.x, y: s.y, opacity: s.opacity, scale: s.scale }}
            animate={{ x: s.x, y: s.y, opacity: s.opacity, scale: s.scale }}
            transition={animate ? {
              duration: sparkDuration,
              delay: sparkBaseDelay + i * 0.025,
              ease: [0.2, 0.8, 0.2, 1],
            } : { duration: 0 }}
          >
            {s.digit}
          </motion.span>
        ))}
      </span>
      <span className="text-cow">Duel</span>
    </h1>
  );
}
