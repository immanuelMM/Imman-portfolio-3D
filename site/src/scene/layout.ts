import type { Agent } from '../data/types'

/**
 * World layout of the command-center room, in metres. The camera stands at the doorway (+z) and looks down a central
 * aisle toward the back wall (-z). Two rack rows flank the aisle, a third row closes the back wall, and the seven agent
 * panels stand in a shallow arc behind the operator console.
 */
export const ROOM = {
  halfWidth: 6.4,
  front: 11,
  back: -7.2,
  height: 3.8,
} as const

export type Vec3 = [number, number, number]

export interface HeroCamera {
  position: Vec3
  target: Vec3
  fov: number
}

export const HERO_CAMERA: HeroCamera = { position: [0, 2.0, 10.4], target: [0, 1.15, -3], fov: 38 }

/** Order of the agent panels from left to right when seen from the doorway (Lead in the middle). */
export const PANEL_ORDER: Agent['id'][] = ['planner', 'backend', 'qa', 'lead', 'frontend', 'docs', 'devops']

export interface AgentPanelSpec {
  agentId: Agent['id']
  position: Vec3
  /** rotation about Y in radians; the panel's front faces the arc centre */
  rotationY: number
  /** [width, height] of the glass in metres */
  size: [number, number]
}

export const ARC = { centre: [0, 0, 0.6] as Vec3, radius: 3.9, spanDeg: 92, panelSize: [0.94, 1.8] as [number, number] }
/** Portrait (phone, tablet): a wider, slightly smaller arc so neighbouring panels never overlap in the narrow frame. */
export const ARC_PORTRAIT = { ...ARC, radius: 3.3, spanDeg: 96, panelSize: [0.75, 1.44] as [number, number] }
/** The panel glass stands on a base of this height. */
export const PANEL_FLOOR_GAP = 0.32

export type PanelLayout = 'wide' | 'tall'

export function buildAgentPanels(layout: PanelLayout = 'wide'): AgentPanelSpec[] {
  const arc = layout === 'tall' ? ARC_PORTRAIT : ARC
  const n = PANEL_ORDER.length
  return PANEL_ORDER.map((agentId, i) => {
    const t = i / (n - 1) - 0.5
    const theta = (t * arc.spanDeg * Math.PI) / 180
    const x = arc.centre[0] + arc.radius * Math.sin(theta)
    const z = arc.centre[2] - arc.radius * Math.cos(theta)
    // Panels flank the middle one slightly higher the further out they are: a gentle bowl, not a wall.
    const y = PANEL_FLOOR_GAP + arc.panelSize[1] / 2 + Math.abs(t) * 0.12
    return { agentId, position: [x, y, z], rotationY: -theta, size: arc.panelSize }
  })
}

export const AGENT_PANELS: AgentPanelSpec[] = buildAgentPanels('wide')
export const AGENT_PANELS_TALL: AgentPanelSpec[] = buildAgentPanels('tall')

export interface RackSpec {
  /** centre of the rack footprint on the floor (y = 0) */
  position: Vec3
  /** rotation about Y; the rack front (local +z) faces (sin yaw, 0, cos yaw) */
  yaw: number
}

export const RACK_SIZE = { w: 0.6, d: 1.0, h: 2.1 } as const
const RACK_PITCH = 0.64
const SIDE_X = 4.15

function row(count: number, make: (i: number) => RackSpec): RackSpec[] {
  return Array.from({ length: count }, (_, i) => make(i))
}

/** 18 racks per side from z = +6.1 (the near ends are outside the hero frame) back to z = -5.1, and 11 across the back wall. */
export const RACKS: RackSpec[] = [
  ...row(18, (i) => ({ position: [-SIDE_X, 0, 6.1 - i * RACK_PITCH], yaw: Math.PI / 2 })),
  ...row(18, (i) => ({ position: [SIDE_X, 0, 6.1 - i * RACK_PITCH], yaw: -Math.PI / 2 })),
  ...row(11, (i) => ({ position: [(i - 5) * RACK_PITCH, 0, -6.45], yaw: 0 })),
]

/** The operator console in front of the arc, seen from behind by the hero camera. */
export const CONSOLE = { position: [0, 0, 3.4] as Vec3, size: [2.1, 0.74, 0.75] as Vec3 }

/** Angle in degrees between a panel's front normal and the direction from the panel to a camera position. */
export function panelFacingError(panel: AgentPanelSpec, camera: Vec3 = HERO_CAMERA.position): number {
  const nx = Math.sin(panel.rotationY)
  const nz = Math.cos(panel.rotationY)
  const dx = camera[0] - panel.position[0]
  const dz = camera[2] - panel.position[2]
  const len = Math.hypot(dx, dz)
  const dot = (nx * dx + nz * dz) / len
  return (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI
}

export interface HeroPose extends HeroCamera {
  /** the scene is shifted right by this fraction of the viewport height (room for the content column on the left) */
  offsetX: number
  /** the scene is shifted up by this fraction of the viewport height (portrait: subject in the top half) */
  offsetY: number
}

/**
 * The hero framing for a viewport. Landscape: the wide establishing shot with the subject shifted right of the content
 * column. Portrait: a closer camera with a taller field of view, so the middle panels fill the width, shifted up so
 * the subject sits in the top ~45% above the cards.
 */
export function heroPoseFor(aspect: number): HeroPose {
  if (aspect >= 1.15) {
    return { ...HERO_CAMERA, offsetX: 0.235 * aspect, offsetY: 0 }
  }
  if (aspect >= 0.95) return { ...HERO_CAMERA, offsetX: 0, offsetY: 0 }
  const fov = Math.min(70, (2 * Math.atan(Math.tan((24 * Math.PI) / 180) / aspect) * 180) / Math.PI)
  return { position: [0, 2.0, 7.6], target: [0, 1.3, -3], fov, offsetX: 0, offsetY: 0.16 }
}
