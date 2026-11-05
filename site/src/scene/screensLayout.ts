import type { Vec3 } from './layout'

export const SCREEN_COLS = 3
export const SCREEN_ROWS = 2
/** One project screen (800:300 art), hung above the back rack row. */
export const SCREEN_SIZE: [number, number] = [2.0, 0.75]
export const SCREEN_Z = -5.85
const COLUMN_X = [-2.3, 0, 2.3]
const ROW_Y = [3.25, 2.4]

/** Centre of project screen `i` (reading order, left to right, top row first). All face the doorway (+z). */
export function screenPosition(i: number): Vec3 {
  return [COLUMN_X[i % SCREEN_COLS], ROW_Y[Math.floor(i / SCREEN_COLS)], SCREEN_Z]
}

/** UV rectangle [u0, v0, u1, v1] of atlas cell `i` (the atlas is read with flipY, row 0 at the top). */
export function cellUv(i: number): [number, number, number, number] {
  const col = i % SCREEN_COLS
  const row = Math.floor(i / SCREEN_COLS)
  return [col / SCREEN_COLS, 1 - (row + 1) / SCREEN_ROWS, (col + 1) / SCREEN_COLS, 1 - row / SCREEN_ROWS]
}
