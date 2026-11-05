import type { AgentPanelSpec, Vec3 } from './layout'

/** A world-space ray (origin and a direction that need not be normalised). */
export interface Ray {
  origin: Vec3
  direction: Vec3
}

/**
 * The agent panel a ray hits first, or null. Each panel is a flat rectangle facing (sin ry, 0, cos ry); a ray that arrives
 * from behind still counts (the holo glass is see-through). `pad` grows the rectangle in metres, for easier touch taps.
 */
export function pickPanel(ray: Ray, panels: readonly AgentPanelSpec[], pad = 0): string | null {
  let best: string | null = null
  let bestT = Infinity
  for (const panel of panels) {
    const nx = Math.sin(panel.rotationY)
    const nz = Math.cos(panel.rotationY)
    const denom = ray.direction[0] * nx + ray.direction[2] * nz
    if (Math.abs(denom) < 1e-6) continue
    const t =
      ((panel.position[0] - ray.origin[0]) * nx +
        (panel.position[1] - ray.origin[1]) * 0 +
        (panel.position[2] - ray.origin[2]) * nz) /
      denom
    if (t <= 0 || t >= bestT) continue
    const hx = ray.origin[0] + ray.direction[0] * t - panel.position[0]
    const hy = ray.origin[1] + ray.direction[1] * t - panel.position[1]
    const hz = ray.origin[2] + ray.direction[2] * t - panel.position[2]
    // the panel's right axis is (cos ry, 0, -sin ry), its up axis is y
    const across = hx * nz - hz * nx
    if (Math.abs(across) <= panel.size[0] / 2 + pad && Math.abs(hy) <= panel.size[1] / 2 + pad) {
      best = panel.agentId
      bestT = t
    }
  }
  return best
}

/** A tap, not a scroll or a drag: the pointer moved less than `slop` px between press and release. */
export function isTap(down: { x: number; y: number }, up: { x: number; y: number }, slop = 8): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) < slop
}

/**
 * Whether a pointer event's target is the bare page behind the content (the scene shows through), so a press there
 * means "the 3D scene", not a link, a button or a text card.
 */
export function isSceneTarget(target: { tagName?: string; matches?: (selector: string) => boolean } | null): boolean {
  if (!target || !target.tagName) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'html' || tag === 'body' || tag === 'main') return true
  return target.matches?.('section[data-chapter], #scene, #scene *') ?? false
}
