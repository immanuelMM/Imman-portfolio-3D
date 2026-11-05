/** ±3% flicker: a sum of incommensurate sines, so it never repeats visibly. Pure and tested. */
export function flicker(t: number, seed: number): number {
  const n =
    Math.sin(t * 9.1 + seed * 5.3) * 0.5 + Math.sin(t * 23.7 + seed * 1.7) * 0.3 + Math.sin(t * 3.3 + seed * 9.1) * 0.2
  return 1 + n * 0.03
}
