import { describe, expect, it } from 'vitest'
import { pickTier, TIER_SETTINGS } from './quality'

describe('pickTier', () => {
  it('uses low for a coarse pointer on a phone width', () => {
    expect(pickTier({ coarsePointer: true, viewportWidth: 390 })).toBe('low')
  })

  it('uses touch for a portrait tablet', () => {
    expect(pickTier({ coarsePointer: true, viewportWidth: 820, portrait: true })).toBe('touch')
  })

  it('keeps high for a landscape tablet and for a 1180px tablet', () => {
    expect(pickTier({ coarsePointer: true, viewportWidth: 1000, portrait: false })).toBe('high')
    expect(pickTier({ coarsePointer: true, viewportWidth: 1180, portrait: true })).toBe('high')
  })

  it('uses high for a fine pointer on desktop, even in a narrow window', () => {
    expect(pickTier({ coarsePointer: false, viewportWidth: 1280 })).toBe('high')
    expect(pickTier({ coarsePointer: false, viewportWidth: 500 })).toBe('high')
  })
})

describe('TIER_SETTINGS', () => {
  it('turns bloom and the reflector floor on for the high tier only', () => {
    expect(TIER_SETTINGS.high.bloom).toBe(true)
    expect(TIER_SETTINGS.high.reflector).toBe(true)
    expect(TIER_SETTINGS.touch.bloom).toBe(false)
    expect(TIER_SETTINGS.touch.reflector).toBe(false)
    expect(TIER_SETTINGS.low.bloom).toBe(false)
    expect(TIER_SETTINGS.low.reflector).toBe(false)
  })

  it('drops shadows, LEDs and texture size on the low tier', () => {
    expect(TIER_SETTINGS.low.shadows).toBe(false)
    expect(TIER_SETTINGS.low.ledCount).toBeLessThan(TIER_SETTINGS.high.ledCount)
    expect(TIER_SETTINGS.low.textureSet).toBe('phone')
    expect(TIER_SETTINGS.high.textureSet).toBe('desktop')
  })

  it('caps the pixel ratio at 1.5 below the high tier', () => {
    expect(TIER_SETTINGS.high.dpr).toEqual([1, 2])
    expect(TIER_SETTINGS.touch.dpr).toEqual([1, 1.5])
    expect(TIER_SETTINGS.low.dpr).toEqual([1, 1.5])
  })
})
