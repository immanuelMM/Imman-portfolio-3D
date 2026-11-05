import { Matrix4, Quaternion, Vector3 } from 'three'
import { RACKS, RACK_SIZE } from './layout'

/** Where the rack-front texture and the LED instances agree: 14 server units, each with a column of status lamps. */
export const RACK_FRONT = {
  units: 14,
  /** height of the first unit's bottom edge, metres */
  y0: 0.13,
  pitch: 0.135,
  /** lamp x positions across the front (local, metres from the rack centre) */
  lampX: [0.1, 0.14, 0.18, 0.22],
  /** lamp y offsets inside one unit */
  lampDy: [0.04, 0.09],
  lampSize: 0.014,
} as const

export const LED_COLOURS = [
  [0.1, 1.0, 0.35], // green
  [1.0, 0.62, 0.12], // amber
  [0.2, 0.6, 1.0], // blue
  [1.0, 0.18, 0.12], // red
] as const

/** Small deterministic generator (mulberry32). */
export function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface LedInstances {
  /** 16 floats per LED: its world matrix (a quad facing out of the rack front) */
  matrices: Float32Array
  /** 0..1 per LED, offsets the blink */
  phases: Float32Array
  /** rgb per LED */
  colours: Float32Array
  /** index of the rack each LED belongs to (for tests) */
  racks: Uint16Array
}

/**
 * `count` status lamps spread over the rack fronts, never two on the same slot. Same seed, same lamps. Most are green,
 * a few amber, blue and red.
 */
export function buildLedInstances(count: number, seed: number): LedInstances {
  const rnd = rng(seed)
  const perUnit = RACK_FRONT.lampX.length * RACK_FRONT.lampDy.length
  const perRack = RACK_FRONT.units * perUnit
  const total = RACKS.length * perRack
  const n = Math.min(count, total)

  // partial Fisher-Yates over all slots
  const slots = new Uint32Array(total)
  for (let i = 0; i < total; i++) slots[i] = i
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rnd() * (total - i))
    const tmp = slots[i]
    slots[i] = slots[j]
    slots[j] = tmp
  }

  const matrices = new Float32Array(n * 16)
  const phases = new Float32Array(n)
  const colours = new Float32Array(n * 3)
  const racks = new Uint16Array(n)
  const m = new Matrix4()
  const q = new Quaternion()
  const pos = new Vector3()
  const scale = new Vector3(1, 1, 1)
  const up = new Vector3(0, 1, 0)

  for (let i = 0; i < n; i++) {
    const slot = slots[i]
    const rackIndex = Math.floor(slot / perRack)
    const inRack = slot % perRack
    const unit = Math.floor(inRack / perUnit)
    const inUnit = inRack % perUnit
    const xi = inUnit % RACK_FRONT.lampX.length
    const yi = Math.floor(inUnit / RACK_FRONT.lampX.length)
    const rack = RACKS[rackIndex]

    const lx = RACK_FRONT.lampX[xi]
    const ly = RACK_FRONT.y0 + unit * RACK_FRONT.pitch + RACK_FRONT.lampDy[yi]
    const lz = RACK_SIZE.d / 2 + 0.006
    // rotate the local offset about Y by the rack yaw
    const cos = Math.cos(rack.yaw)
    const sin = Math.sin(rack.yaw)
    pos.set(rack.position[0] + lx * cos + lz * sin, ly, rack.position[2] - lx * sin + lz * cos)
    q.setFromAxisAngle(up, rack.yaw)
    m.compose(pos, q, scale)
    m.toArray(matrices, i * 16)

    phases[i] = rnd()
    const r = rnd()
    const colour = LED_COLOURS[r < 0.62 ? 0 : r < 0.8 ? 1 : r < 0.96 ? 2 : 3]
    colours.set(colour, i * 3)
    racks[i] = rackIndex
  }
  return { matrices, phases, colours, racks }
}
