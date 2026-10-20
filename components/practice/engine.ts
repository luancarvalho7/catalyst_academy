/* Deterministic primitives shared by the practice simulators. Prices are cents on a 0–100 scale. */

export type PricePoint = { x: number; price: number };

export type Keyframe = { at: number; price: number; ease?: "linear" | "smooth" };

/** mulberry32 — 32-bit state, period 2^32; identical sequences for identical seeds on every engine. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: () => number, [min, max]: readonly [number, number]): number {
  return Math.floor(min + rng() * (max - min + 1));
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Samples a price path through keyframes every `step` x-units. Noise is enveloped by sin(πu) so every
 * keyframe lands exactly on its scripted price; O(n) in the number of samples.
 */
export function buildPath(keyframes: Keyframe[], { step = 1, noise = 0, seed = 1 } = {}): PricePoint[] {
  const rng = createRng(seed);
  const points: PricePoint[] = [];
  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const from = keyframes[index];
    const to = keyframes[index + 1];
    const span = to.at - from.at;
    for (let x = from.at; x < to.at - 1e-9; x += step) {
      const progress = (x - from.at) / span;
      const eased = to.ease === "smooth" ? progress * progress * (3 - 2 * progress) : progress;
      const wobble = noise * Math.sin(Math.PI * progress) * (rng() * 2 - 1);
      points.push({ x, price: clamp(from.price + (to.price - from.price) * eased + wobble, 0, 100) });
    }
  }
  const last = keyframes[keyframes.length - 1];
  points.push({ x: last.at, price: last.price });
  return points;
}

const MINUS = "−";

export function formatUsd(value: number, { sign = false, decimals = 2 }: { sign?: boolean; decimals?: number } = {}): string {
  const magnitude = Math.abs(value);
  const body = magnitude.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const negligible = magnitude < 0.5 * 10 ** -decimals;
  if (value < 0 && !negligible) return `${MINUS}$${body}`;
  return `${sign && !negligible ? "+" : ""}$${body}`;
}

export function formatCents(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}¢`;
}

export function formatSignedCents(value: number, decimals = 1): string {
  const rounded = Number(value.toFixed(decimals));
  if (rounded === 0) return `${(0).toFixed(decimals)}¢`;
  return `${rounded > 0 ? "+" : MINUS}${Math.abs(rounded).toFixed(decimals)}¢`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
