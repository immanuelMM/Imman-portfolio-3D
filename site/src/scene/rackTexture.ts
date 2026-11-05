import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import { RACK_FRONT, rng } from './leds'
import { RACK_SIZE } from './layout'

/** Pixels per metre at scale 1: the front texture is 0.6 m x 2.1 m. */
const PPM = 426

type UnitKind = 'server' | 'server2' | 'switch' | 'blank' | 'patch' | 'ups'

/** Height-map greys: flat bezel, recessed, raised. */
const FLAT = 170
const DEEP = 60
const RAISED = 235

/**
 * The front of a server rack, drawn at runtime (0 KB): rails, 14 units (servers with vent grilles and drive bays, switches
 * with port rows, patch panels, blanks, a UPS) and a lamp plate on every unit that the LED instances sit on (leds.ts agrees on
 * the positions). A matching normal map is derived from a height canvas drawn alongside, so the vents and bays catch light.
 */
export function createRackTextures(scale = 1): { map: CanvasTexture; normalMap: CanvasTexture } {
  const ppm = PPM * scale
  const W = Math.round(RACK_SIZE.w * ppm)
  const H = Math.round(RACK_SIZE.h * ppm)
  const color = document.createElement('canvas')
  const height = document.createElement('canvas')
  color.width = height.width = W
  color.height = height.height = H
  const c = color.getContext('2d')!
  const h = height.getContext('2d')!

  // metres (rack-local: x from the centre, y up from the floor) to canvas pixels
  const px = (x: number) => (x + RACK_SIZE.w / 2) * ppm
  const py = (y: number) => H - y * ppm
  const rect = (x0: number, y0: number, x1: number, y1: number, fill: string, hv: number | null) => {
    const left = px(x0)
    const top = py(y1)
    const w = (x1 - x0) * ppm
    const hh = (y1 - y0) * ppm
    c.fillStyle = fill
    c.fillRect(left, top, w, hh)
    if (hv !== null) {
      h.fillStyle = `rgb(${hv},${hv},${hv})`
      h.fillRect(left, top, w, hh)
    }
  }

  // rails and frame
  c.fillStyle = '#0b0e12'
  c.fillRect(0, 0, W, H)
  h.fillStyle = `rgb(${FLAT},${FLAT},${FLAT})`
  h.fillRect(0, 0, W, H)
  const post = 0.034
  rect(-RACK_SIZE.w / 2, 0, -RACK_SIZE.w / 2 + post, RACK_SIZE.h, '#1b2129', 200)
  rect(RACK_SIZE.w / 2 - post, 0, RACK_SIZE.w / 2, RACK_SIZE.h, '#1b2129', 200)
  rect(-RACK_SIZE.w / 2, 0, RACK_SIZE.w / 2, 0.1, '#12161c', 150)
  rect(-RACK_SIZE.w / 2, RACK_SIZE.h - 0.07, RACK_SIZE.w / 2, RACK_SIZE.h, '#12161c', 150)
  // rail screw holes
  for (let i = 0; i < 44; i++) {
    const y = 0.13 + i * 0.045
    for (const x of [-RACK_SIZE.w / 2 + post / 2, RACK_SIZE.w / 2 - post / 2]) {
      rect(x - 0.003, y, x + 0.003, y + 0.006, '#050607', DEEP)
    }
  }

  const rnd = rng(19)
  const kinds: UnitKind[] = []
  for (let i = 0; i < RACK_FRONT.units; i++) {
    const r = rnd()
    kinds.push(
      i === 0 ? 'ups' : r < 0.42 ? 'server' : r < 0.62 ? 'server2' : r < 0.74 ? 'switch' : r < 0.86 ? 'patch' : 'blank',
    )
  }

  const left = -RACK_SIZE.w / 2 + post + 0.008
  const right = RACK_SIZE.w / 2 - post - 0.008
  const lampPlateX0 = 0.075
  for (let i = 0; i < RACK_FRONT.units; i++) {
    const y0 = RACK_FRONT.y0 + i * RACK_FRONT.pitch
    const y1 = y0 + RACK_FRONT.pitch - 0.012
    const kind = kinds[i]
    // bezel: a vertical gradient for a brushed edge
    const g = c.createLinearGradient(0, py(y1), 0, py(y0))
    g.addColorStop(0, '#2a323c')
    g.addColorStop(0.08, '#171c23')
    g.addColorStop(1, '#0f1318')
    c.fillStyle = g
    c.fillRect(px(left), py(y1), (right - left) * ppm, (y1 - y0) * ppm)
    h.fillStyle = `rgb(${FLAT + 18},${FLAT + 18},${FLAT + 18})`
    h.fillRect(px(left), py(y1), (right - left) * ppm, (y1 - y0) * ppm)

    const dataRight = kind === 'blank' || kind === 'patch' ? right - 0.004 : lampPlateX0 - 0.012
    if (kind === 'server' || kind === 'server2' || kind === 'ups') {
      // vent grille: rows of small recessed slots
      const vx1 = kind === 'server' ? left + 0.12 : dataRight
      const rows = 6
      for (let r = 0; r < rows; r++) {
        const yy = y0 + 0.012 + (r * (y1 - y0 - 0.024)) / rows
        for (let x = left + 0.012; x < vx1 - 0.008; x += 0.011) {
          rect(x, yy, x + 0.007, yy + 0.0055, '#030405', DEEP)
        }
      }
      if (kind === 'server') {
        // drive bays with handles
        const bayW = 0.034
        for (let b = 0; b < 4; b++) {
          const bx = left + 0.138 + b * (bayW + 0.006)
          if (bx + bayW > dataRight) break
          rect(bx, y0 + 0.012, bx + bayW, y1 - 0.012, '#0a0d11', DEEP)
          rect(bx + 0.004, y0 + 0.02, bx + bayW - 0.004, y0 + 0.027, '#3a434f', RAISED)
        }
      }
    } else if (kind === 'switch' || kind === 'patch') {
      // port rows
      const rows = kind === 'switch' ? 2 : 2
      const cols = kind === 'switch' ? 12 : 16
      const span = dataRight - (left + 0.01)
      const pitch = span / cols
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < cols; k++) {
          const bx = left + 0.012 + k * pitch
          const by = y0 + 0.016 + r * 0.05
          rect(bx, by, bx + pitch * 0.72, by + 0.034, '#020304', DEEP)
          rect(bx + 0.002, by + 0.002, bx + pitch * 0.72 - 0.002, by + 0.006, '#8d6a1e', RAISED)
        }
      }
    }
    if (kind !== 'blank' && kind !== 'patch') {
      // lamp plate with a socket under each lamp
      rect(lampPlateX0, y0 + 0.008, right - 0.004, y1 - 0.008, '#07090c', DEEP + 40)
      for (const lx of RACK_FRONT.lampX) {
        for (const dy of RACK_FRONT.lampDy) {
          const r = RACK_FRONT.lampSize * 0.75
          rect(lx - r, y0 + dy - r, lx + r, y0 + dy + r, '#1b2026', DEEP + 70)
        }
      }
    } else {
      // blank / patch: lamps still sit on the unit, so give them a small plate too
      rect(lampPlateX0, y0 + 0.008, right - 0.004, y1 - 0.008, '#090b0e', DEEP + 40)
    }
    // a pale asset label and a unit seam
    rect(left + 0.004, y1 - 0.016, left + 0.034, y1 - 0.01, '#9aa6b2', RAISED)
    rect(left, y0 - 0.002, right, y0 + 0.001, '#020304', DEEP)
  }

  // soft grime so no two metres of the door are the same
  c.globalAlpha = 0.05
  for (let i = 0; i < 90; i++) {
    c.fillStyle = rnd() < 0.5 ? '#ffffff' : '#000000'
    c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 6 + rnd() * 40)
  }
  c.globalAlpha = 1

  const map = new CanvasTexture(color)
  map.colorSpace = SRGBColorSpace
  map.anisotropy = 8
  map.minFilter = LinearMipmapLinearFilter

  const normalMap = new CanvasTexture(heightToNormal(height, 2.2))
  normalMap.anisotropy = 8
  return { map, normalMap }
}

/** Sobel height -> tangent-space normal map (OpenGL convention: +Y up in texture space). */
export function heightToNormal(source: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const w = source.width
  const hgt = source.height
  const data = source.getContext('2d')!.getImageData(0, 0, w, hgt).data
  const out = document.createElement('canvas')
  out.width = w
  out.height = hgt
  const octx = out.getContext('2d')!
  const img = octx.createImageData(w, hgt)
  const at = (x: number, y: number) =>
    data[(Math.min(hgt - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4] / 255
  for (let y = 0; y < hgt; y++) {
    for (let x = 0; x < w; x++) {
      const dx =
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
      const dy =
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
      // canvas y grows downward, texture v grows upward: dy flips sign
      let nx = -dx * strength
      let ny = dy * strength
      let nz = 1
      const len = Math.hypot(nx, ny, nz)
      nx /= len
      ny /= len
      nz /= len
      const i = (y * w + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  octx.putImageData(img, 0, 0)
  return out
}
