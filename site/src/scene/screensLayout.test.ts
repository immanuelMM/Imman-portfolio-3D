import { describe, expect, it } from 'vitest'
import manifest from '../../public/screens/manifest.json'
import { aiTools } from '../data/projects'
import { cellUv, SCREEN_COLS, SCREEN_ROWS, SCREEN_SIZE, screenPosition } from './screensLayout'

describe('project screens', () => {
  it('follows the order of the AI project cards in the atlas', () => {
    expect(manifest.cells).toEqual(aiTools.map((p) => p.image!.replace('.svg', '')))
    expect(manifest.cols).toBe(SCREEN_COLS)
    expect(manifest.rows).toBe(SCREEN_ROWS)
  })

  it('hangs six screens in a grid without overlaps, below the ceiling and above the racks', () => {
    const spots = manifest.cells.map((_, i) => screenPosition(i))
    for (const [i, a] of spots.entries())
      for (const b of spots.slice(i + 1)) {
        const apart = Math.abs(a[0] - b[0]) >= SCREEN_SIZE[0] || Math.abs(a[1] - b[1]) >= SCREEN_SIZE[1]
        expect(apart).toBe(true)
      }
    for (const [, y] of spots) {
      expect(y - SCREEN_SIZE[1] / 2).toBeGreaterThan(2.0)
      expect(y + SCREEN_SIZE[1] / 2).toBeLessThan(3.8)
    }
  })

  it('maps each cell to its own UV rectangle inside 0..1', () => {
    const seen = new Set<string>()
    for (let i = 0; i < SCREEN_COLS * SCREEN_ROWS; i++) {
      const [u0, v0, u1, v1] = cellUv(i)
      expect(u0).toBeGreaterThanOrEqual(0)
      expect(v1).toBeLessThanOrEqual(1)
      expect(u1).toBeGreaterThan(u0)
      expect(v1).toBeGreaterThan(v0)
      seen.add([u0, v0].join())
    }
    expect(seen.size).toBe(6)
  })
})
