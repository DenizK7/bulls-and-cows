"use client";

// Lightweight Web Audio synth — no asset files needed, fits the retro/pixel feel.
// (howler is available for sampled SFX later; this keeps Phase 1 asset-free.)

export type SoundName =
  | "guess"
  | "bull"
  | "cow"
  | "miss"
  | "win"
  | "lose"
  | "turn"
  | "button";

let ctx: AudioContext | null = null;
let enabled = true;
let loaded = false;

function loadEnabled() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const saved = localStorage.getItem("sfxEnabled");
  enabled = saved === null ? true : saved === "true";
}

// Created lazily on first play (after a user gesture) to respect autoplay policy.
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// One enveloped oscillator note. `start` is an offset (s) from now.
function note(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "triangle",
  peak = 0.18,
) {
  const c = ctx!;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export function playSound(name: SoundName) {
  loadEnabled();
  if (!enabled) return;
  if (!getCtx()) return;

  switch (name) {
    case "button":
      note(520, 0, 0.05, "triangle", 0.08);
      break;
    case "guess":
      note(360, 0, 0.07, "square", 0.1);
      break;
    case "turn":
      note(620, 0, 0.09, "sine", 0.12);
      note(780, 0.06, 0.1, "sine", 0.1);
      break;
    case "bull":
      note(660, 0, 0.09, "triangle", 0.16);
      note(990, 0.07, 0.13, "triangle", 0.16);
      break;
    case "cow":
      note(520, 0, 0.12, "triangle", 0.14);
      break;
    case "miss":
      note(240, 0, 0.14, "sawtooth", 0.1);
      note(170, 0.09, 0.16, "sawtooth", 0.08);
      break;
    case "win": {
      const arp = [523, 659, 784, 1047];
      arp.forEach((f, i) => note(f, i * 0.11, 0.22, "triangle", 0.18));
      break;
    }
    case "lose": {
      const seq = [440, 330, 247];
      seq.forEach((f, i) => note(f, i * 0.14, 0.26, "sawtooth", 0.13));
      break;
    }
  }
}

export function isSfxEnabled(): boolean {
  loadEnabled();
  return enabled;
}

export function setSfxEnabled(value: boolean) {
  loaded = true;
  enabled = value;
  if (typeof window !== "undefined") localStorage.setItem("sfxEnabled", String(value));
  // Warm up the context on enable (we're inside a click handler → allowed).
  if (value) getCtx();
}
