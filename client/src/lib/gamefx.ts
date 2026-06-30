"use client";

// Lightweight WebGL particle FX (PixiJS) for in-game juice. No external assets.
// Module API: mountFX() boots the canvas; fxVictory()/fxSpark() emit bursts.

import type { Application as PixiApp, Graphics as PixiGraphics } from "pixi.js";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: number };

let app: PixiApp | null = null;
let gfx: PixiGraphics | null = null;
let particles: Particle[] = [];
const GRAVITY = 0.07;

const GOLD = [0xf0d45b, 0xc2916a, 0xd8b48f, 0xffe9a8];
const GREEN = [0x7cb87c, 0x8fe0a0];
const AMBER = [0xd49a5c, 0xe0b070];

function tick(dt: number) {
  if (!gfx) return;
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += GRAVITY * dt;
    p.life -= dt;
  }
  particles = particles.filter((p) => p.life > 0);
  gfx.clear();
  for (const p of particles) {
    const a = Math.max(0, Math.min(1, p.life / p.max));
    gfx.circle(p.x, p.y, p.r).fill({ color: p.color, alpha: a });
  }
}

export async function mountFX(container: HTMLElement): Promise<() => void> {
  if (typeof window === "undefined") return () => {};
  const { Application, Graphics } = await import("pixi.js");
  const a = new Application();
  await a.init({ backgroundAlpha: 0, antialias: true, resizeTo: window, autoDensity: true, resolution: window.devicePixelRatio || 1 });
  app = a;
  container.appendChild(a.canvas);
  gfx = new Graphics();
  a.stage.addChild(gfx);
  a.ticker.add((t) => tick(t.deltaTime));
  return () => {
    particles = [];
    try { a.destroy(true, { children: true }); } catch { /* noop */ }
    if (app === a) { app = null; gfx = null; }
  };
}

function emit(
  x: number,
  y: number,
  n: number,
  colors: number[],
  opts: { speed?: number; life?: number; spread?: number; up?: number } = {},
) {
  if (!app) return;
  const speed = opts.speed ?? 6;
  const life = opts.life ?? 60;
  const spread = opts.spread ?? Math.PI * 2;
  const up = opts.up ?? 0;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const sp = speed * (0.4 + Math.random() * 0.9);
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - up,
      life: life * (0.6 + Math.random() * 0.6),
      max: life,
      r: 2 + Math.random() * 3,
      color: colors[(Math.random() * colors.length) | 0],
    });
  }
}

export function fxVictory() {
  if (!app || typeof window === "undefined") return;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.32;
  emit(cx, cy, 170, [...GOLD, ...GREEN], { speed: 9, life: 95, spread: Math.PI * 2, up: 2 });
  setTimeout(() => emit(cx, cy, 90, GOLD, { speed: 13, life: 80, up: 4 }), 180);
  setTimeout(() => emit(cx, cy, 70, GREEN, { speed: 11, life: 85, up: 3 }), 360);
}

export function fxSpark(x: number, y: number, kind: "bull" | "cow") {
  emit(x, y, 24, kind === "bull" ? [...GREEN, ...GOLD] : AMBER, { speed: 5, life: 42, up: 1 });
}
