/** high: desktop and landscape tablet. touch: portrait tablet. low: phone. */
export type QualityTier = 'high' | 'touch' | 'low'

export interface TierSettings {
  dpr: [number, number]
  /** bloom post-processing on the holo panels (lazy chunk, high tier only) */
  bloom: boolean
  /** drei MeshReflectorMaterial floor (high only; the other tiers use a plain glossy floor) */
  reflector: boolean
  /** real-time shadow maps */
  shadows: boolean
  /** status LEDs drawn on the racks */
  ledCount: number
  /** texture set: desktop 1024/512, phone one step down */
  textureSet: 'desktop' | 'phone'
  /** MSAA on the WebGL context */
  msaa: boolean
}

export const TIER_SETTINGS: Record<QualityTier, TierSettings> = {
  high: { dpr: [1, 2], bloom: true, reflector: true, shadows: true, ledCount: 600, textureSet: 'desktop', msaa: true },
  touch: {
    dpr: [1, 1.5],
    bloom: false,
    reflector: false,
    shadows: true,
    ledCount: 400,
    textureSet: 'desktop',
    msaa: true,
  },
  low: {
    dpr: [1, 1.5],
    bloom: false,
    reflector: false,
    shadows: false,
    ledCount: 200,
    textureSet: 'phone',
    msaa: true,
  },
}

/**
 * Landscape and desktop get the full tier; a portrait tablet (>= 640) the touch tier; a phone (< 640) the low tier.
 * A landscape touch tablet (>= 1024 wide) keeps the full tier.
 */
export function pickTier(env: { coarsePointer: boolean; viewportWidth: number; portrait?: boolean }): QualityTier {
  if (env.viewportWidth < 640 && env.coarsePointer) return 'low'
  if (env.coarsePointer && env.viewportWidth < 1024) return env.portrait === false ? 'high' : 'touch'
  return 'high'
}

/**
 * `?tier=high|touch|low` pins the tier (for QA, budgets and posters): the page keeps that look and never steps down when
 * the frame rate dips. Anything else is ignored.
 */
export function tierOverride(search: string): QualityTier | null {
  const value = new URLSearchParams(search).get('tier')
  return value === 'high' || value === 'touch' || value === 'low' ? value : null
}

export function pickBrowserTier(): QualityTier {
  return (
    tierOverride(window.location.search) ??
    pickTier({
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
      viewportWidth: window.innerWidth,
      portrait: window.innerHeight >= window.innerWidth,
    })
  )
}
