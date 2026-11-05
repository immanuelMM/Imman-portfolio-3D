/** ±3% flicker: a sum of incommensurate sines, so it never repeats visibly. Pure and tested. */
export function flicker(t: number, seed: number): number {
  const n =
    Math.sin(t * 9.1 + seed * 5.3) * 0.5 + Math.sin(t * 23.7 + seed * 1.7) * 0.3 + Math.sin(t * 3.3 + seed * 9.1) * 0.2
  return 1 + n * 0.03
}

/** Seconds the panels take to power on once the scene is revealed, and the stagger between neighbours. */
export const POWER_ON = { duration: 0.9, stagger: 0.14, segment: 0.075 } as const

const hash = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * The load "flicker-in" of panel `index`, `elapsed` seconds after the reveal: dark, then stuttering on and off with the
 * on-time growing, then steady at 1. Deterministic (hash of the 75 ms segment) so it can be tested; the panels start left
 * to right 0.14 s apart.
 */
export function powerOn(elapsed: number, index: number): number {
  const local = elapsed - index * POWER_ON.stagger
  if (local <= 0) return 0
  if (local >= POWER_ON.duration) return 1
  const progress = local / POWER_ON.duration
  const segment = Math.floor(local / POWER_ON.segment)
  return hash(segment, index) < 0.1 + progress * 0.85 ? 0.35 + 0.65 * progress : 0.05
}
