/** Largest card tilt in degrees. */
export const MAX_TILT = 4

export interface GlassPointer {
  /** rotation about x and y, degrees (the card leans toward the cursor) */
  rx: number
  ry: number
  /** cursor position inside the card, percent, for the radial highlight */
  mx: number
  my: number
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Tilt and highlight position for a pointer at (x, y) over a card rect. Pure; the script only writes the numbers. */
export function glassPointer(
  rect: { left: number; top: number; width: number; height: number },
  x: number,
  y: number,
): GlassPointer {
  const px = rect.width > 0 ? clamp((x - rect.left) / rect.width, 0, 1) : 0.5
  const py = rect.height > 0 ? clamp((y - rect.top) / rect.height, 0, 1) : 0.5
  return {
    ry: (px - 0.5) * 2 * MAX_TILT,
    rx: (0.5 - py) * 2 * MAX_TILT,
    mx: px * 100,
    my: py * 100,
  }
}

/** Tilt and the cursor highlight run for a mouse-like pointer only, and never with reduced motion. */
export function glassEnabled(finePointer: boolean, reducedMotion: boolean): boolean {
  return finePointer && !reducedMotion
}
