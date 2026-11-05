/** Sideways and vertical camera drift, in metres, when the pointer is at the very edge of the window. Small on purpose. */
export const PARALLAX_RANGE = { x: 0.18, y: 0.09 } as const

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Pointer position as -1..1 on both axes from the window centre, y up. */
export function normalizePointer(clientX: number, clientY: number, width: number, height: number): [number, number] {
  if (width <= 0 || height <= 0) return [0, 0]
  return [clamp((clientX / width) * 2 - 1, -1, 1), clamp(1 - (clientY / height) * 2, -1, 1)]
}

/** The camera offset a pointer position asks for: the camera moves toward the pointer, so the room seems to have depth. */
export function parallaxTarget(nx: number, ny: number, active: boolean): [number, number] {
  if (!active) return [0, 0]
  return [clamp(nx, -1, 1) * PARALLAX_RANGE.x, clamp(ny, -1, 1) * PARALLAX_RANGE.y]
}

/**
 * Parallax runs only for a mouse-like pointer (hover + fine), with motion allowed, and not while an agent card is open
 * (the camera is parked in front of the panel then).
 */
export function parallaxActive(opts: { finePointer: boolean; motion: boolean; cardOpen: boolean }): boolean {
  return opts.finePointer && opts.motion && !opts.cardOpen
}
