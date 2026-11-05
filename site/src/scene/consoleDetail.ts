import {
  BoxGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  SphereGeometry,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

type Rgb = [number, number, number]

const hex = (value: number): Rgb =>
  [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255].map((c) => Math.pow(c, 2.2)) as Rgb

/** Linear vertex colours of the dark parts: brushed steel trim, graphite plastic, rubber. */
export const DETAIL_COLOURS = {
  steel: hex(0x9aa6b2),
  graphite: hex(0x14181d),
  keycap: hex(0x0c0f13),
  rubber: hex(0x07090b),
} as const

/** A part of the console detail: a geometry placed in the console's local space and painted one colour. */
function part(source: BufferGeometry, position: [number, number, number], colour: Rgb): BufferGeometry {
  // RoundedBoxGeometry is non-indexed and the primitives are indexed: merging needs one kind, so everything is non-indexed
  const geometry = source.index ? source.toNonIndexed() : source
  if (geometry !== source) source.dispose()
  geometry.applyMatrix4(new Matrix4().makeTranslation(...position))
  const count = geometry.getAttribute('position').count
  geometry.setAttribute('color', new Float32BufferAttribute(Array.from({ length: count }, () => colour).flat(), 3))
  return geometry
}

/**
 * The small hardware on the operator console, merged into ONE geometry (one draw call, vertex colours instead of one
 * material per part): a bevelled steel trim band under the desktop, a cable tray with its rim under the front overhang,
 * the keyboard body and wrist rest, a mouse pad and a mouse. `bw`, `bh`, `bd` are the desk body's width, height and depth;
 * the desktop slab sits on top of it (its upper face at `bh + 0.045`).
 */
export function buildConsoleDetail(bw: number, bh: number, bd: number): BufferGeometry {
  const topY = bh + 0.045
  const parts: BufferGeometry[] = []

  // trim band: a thin bevelled steel frame a little wider than the body, right under the desktop slab
  parts.push(
    part(new RoundedBoxGeometry(bw + 0.12, 0.034, bd + 0.12, 3, 0.012), [0, bh - 0.006, 0], DETAIL_COLOURS.steel),
  )

  // cable tray under the front overhang: a floor and two lips, open at the top
  const trayW = bw - 0.28
  const trayZ = bd / 2 + 0.034
  const trayTop = bh - 0.034
  parts.push(part(new BoxGeometry(trayW, 0.012, 0.1), [0, trayTop - 0.06, trayZ], DETAIL_COLOURS.steel))
  parts.push(part(new BoxGeometry(trayW, 0.06, 0.012), [0, trayTop - 0.03, trayZ + 0.044], DETAIL_COLOURS.steel))
  parts.push(part(new BoxGeometry(trayW, 0.06, 0.012), [0, trayTop - 0.03, trayZ - 0.044], DETAIL_COLOURS.steel))
  for (const side of [-1, 1]) {
    // end plates and one hanger bracket near each end
    parts.push(
      part(new BoxGeometry(0.012, 0.06, 0.1), [side * (trayW / 2), trayTop - 0.03, trayZ], DETAIL_COLOURS.steel),
    )
    parts.push(
      part(
        new BoxGeometry(0.02, 0.05, 0.06),
        [side * (trayW / 2 - 0.18), trayTop + 0.0, bd / 2 + 0.004],
        DETAIL_COLOURS.steel,
      ),
    )
  }

  // front of the body: two vertical panel seams and a vent grille of slats on the left panel
  for (const x of [-0.5, 0.5]) {
    parts.push(part(new BoxGeometry(0.008, bh - 0.3, 0.012), [x, bh / 2 - 0.02, bd / 2 + 0.002], DETAIL_COLOURS.rubber))
  }
  for (let i = 0; i < 9; i++) {
    parts.push(
      part(new BoxGeometry(0.36, 0.011, 0.012), [-0.78, 0.2 + i * 0.034, bd / 2 + 0.002], DETAIL_COLOURS.rubber),
    )
  }

  // keyboard on the desktop, near the front edge, with a wrist rest
  const kbZ = bd / 2 - 0.16
  parts.push(part(new RoundedBoxGeometry(0.54, 0.02, 0.19, 3, 0.006), [0, topY + 0.01, kbZ], DETAIL_COLOURS.graphite))
  parts.push(
    part(new RoundedBoxGeometry(0.54, 0.014, 0.07, 3, 0.006), [0, topY + 0.007, kbZ + 0.13], DETAIL_COLOURS.rubber),
  )

  // mouse pad and mouse
  parts.push(
    part(new RoundedBoxGeometry(0.2, 0.004, 0.17, 2, 0.002), [0.5, topY + 0.002, kbZ - 0.01], DETAIL_COLOURS.rubber),
  )
  const mouse = new SphereGeometry(0.03, 14, 8)
  mouse.scale(1, 0.55, 1.6)
  parts.push(part(mouse, [0.5, topY + 0.014, kbZ - 0.01], DETAIL_COLOURS.graphite))

  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error('console detail geometries do not share attributes')
  return merged
}

export interface CableSpec {
  /** x centre, z and y in the console's local space */
  z: number
  y: number
  /** linear RGB */
  colour: Rgb
}

/** Three cables lying in the tray: signal (grey), network (blue) and a warm amber power lead. */
export function cableSpecs(bd: number, bh: number): CableSpec[] {
  const z = bd / 2 + 0.034
  const y = bh - 0.034 - 0.047
  return [
    { z: z - 0.026, y, colour: hex(0x5b6671) },
    { z, y, colour: hex(0x1f4f8f) },
    { z: z + 0.026, y, colour: hex(0xd98a1c) },
  ]
}

/** One cylinder lying along x, as the unit cable geometry that the cable InstancedMesh scales to the tray length. */
export function cableGeometry(length: number): BufferGeometry {
  const g = new CylinderGeometry(0.0085, 0.0085, length, 8, 1)
  g.rotateZ(Math.PI / 2)
  return g
}

/**
 * The under-lit front edge of the desk as one geometry with vertex colours above 1 (unlit, so it blooms): a long cool cyan
 * run and a short warm amber run, the console's one warm accent next to the cyan of the panels.
 */
export function buildEdgeLight(bw: number, bd: number): BufferGeometry {
  const half = bw / 2 - 0.1
  const cyanLen = half * 2 * 0.72
  const amberLen = half * 2 - cyanLen - 0.05
  const y = 0.07
  const z = bd / 2 + 0.003
  const cyan = part(new BoxGeometry(cyanLen, 0.014, 0.008), [-half + cyanLen / 2, y, z], [0.3, 1.0, 1.15])
  const amber = part(new BoxGeometry(amberLen, 0.014, 0.008), [half - amberLen / 2, y, z], [1.5, 0.78, 0.2])
  const merged = mergeGeometries([cyan, amber], false)
  cyan.dispose()
  amber.dispose()
  if (!merged) throw new Error('edge light geometries do not share attributes')
  return merged
}
