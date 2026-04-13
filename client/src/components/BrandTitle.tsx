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
    sparkRadius: 32,
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

// Digits trailing along each sword's diagonal — left sword drips down-left,
// right sword drips down-right, one small center below crossing point.
const DRIP_POSITIONS = [
  { nx: -0.45, ny: 0.50 },  // left pommel area
  { nx: 0.45, ny: 0.50 },   // right pommel area
  { nx: -0.80, ny: 0.88 },  // left trail, following diagonal outward
  { nx: 0.80, ny: 0.88 },   // right trail, following diagonal outward
  { nx: 0.0, ny: 0.35 },    // center, just below where blades cross
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
  const sparkBaseDelay = animate ? 2.3 : 0;
  const sparkDuration = animate ? 0.4 : 0;

  // Dust particles — bigger, more dramatic
  const dustCount = animate ? 8 : 0;

  return (
    <h1 className={`font-pixel ${cfg.text} flex items-center justify-center ${cfg.containerGap} relative leading-none`}>
      {/* "Digit" — falls, slams, bounces once */}
      <motion.span className="text-bull relative inline-block"
        initial={animate ? { y: -300, opacity: 0 } : {}}
        animate={animate ? { y: [-300, 0, -14, 0], opacity: [0, 1, 1, 1] } : { y: 0, opacity: 1 }}
        transition={animate ? { duration: 0.8, ease: "easeOut", delay: 0.2, times: [0, 0.5, 0.75, 1] } : { duration: 0 }}
      >
        Digit
        {/* Dust explosion on slam — 24 particles bursting from bottom */}
        {animate && mounted && Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI; // 0 to PI (semicircle upward)
          const dist = 20 + (i % 5) * 10;
          return (
            <motion.span key={`dl${i}`}
              className="absolute -bottom-1 left-1/2 pointer-events-none"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: Math.cos(angle) * dist * (i % 2 ? 1 : -1),
                y: -Math.sin(angle) * dist,
                opacity: [0, 0.9, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
            >
              <span className="block w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cow/70" />
            </motion.span>
          );
        })}
      </motion.span>

      {/* Swords appear after both words land */}
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
      {/* "Duel" — falls, slams, bounces once */}
      <motion.span className="text-cow relative inline-block"
        initial={animate ? { y: -300, opacity: 0 } : {}}
        animate={animate ? { y: [-300, 0, -14, 0], opacity: [0, 1, 1, 1] } : { y: 0, opacity: 1 }}
        transition={animate ? { duration: 0.8, ease: "easeOut", delay: 1.0, times: [0, 0.5, 0.75, 1] } : { duration: 0 }}
      >
        Duel
        {animate && mounted && Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI;
          const dist = 20 + (i % 5) * 10;
          return (
            <motion.span key={`dr${i}`}
              className="absolute -bottom-1 left-1/2 pointer-events-none"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: Math.cos(angle) * dist * (i % 2 ? 1 : -1),
                y: -Math.sin(angle) * dist,
                opacity: [0, 0.9, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{ duration: 0.8, delay: 1.5, ease: "easeOut" }}
            >
              <span className="block w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cow/70" />
            </motion.span>
          );
        })}
      </motion.span>
    </h1>
  );
}
