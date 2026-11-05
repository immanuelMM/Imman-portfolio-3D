import { describe, expect, it } from 'vitest'
import type { Box3 } from 'three'
import { buildConsoleDetail, buildEdgeLight, cableGeometry, cableSpecs } from './consoleDetail'
import { CONSOLE } from './layout'

const [bw, bh, bd] = CONSOLE.size

describe('console detail', () => {
  it('merges the trim, tray, keyboard and mouse into one geometry with a colour per vertex', () => {
    const g = buildConsoleDetail(bw, bh, bd)
    const position = g.getAttribute('position')
    expect(g.getAttribute('color').count).toBe(position.count)
    expect(g.getAttribute('normal').count).toBe(position.count)
    expect(position.count).toBeGreaterThan(500)
  })

  it('stays within the desk footprint (plus the trim and tray overhang) and above the floor', () => {
    const g = buildConsoleDetail(bw, bh, bd)
    g.computeBoundingBox()
    const box = g.boundingBox as Box3
    expect(box.min.x).toBeGreaterThan(-bw / 2 - 0.2)
    expect(box.max.x).toBeLessThan(bw / 2 + 0.2)
    expect(box.max.z).toBeLessThan(bd / 2 + 0.2)
    expect(box.min.z).toBeGreaterThan(-bd / 2 - 0.2)
    expect(box.min.y).toBeGreaterThan(0.05) // the vent slats and panel seams on the body front
    expect(box.max.y).toBeLessThan(bh + 0.15)
  })

  it('lays three cables in the tray, side by side and inside its width', () => {
    const cables = cableSpecs(bd, bh)
    expect(cables).toHaveLength(3)
    expect(new Set(cables.map((c) => c.z)).size).toBe(3)
    const length = bw - 0.32
    const g = cableGeometry(length)
    g.computeBoundingBox()
    expect((g.boundingBox as Box3).max.x).toBeCloseTo(length / 2, 5)
  })

  it('has a cyan run and a warm amber run in the edge light', () => {
    const g = buildEdgeLight(bw, bd)
    const colour = g.getAttribute('color')
    const seen = new Set<string>()
    for (let i = 0; i < colour.count; i++) seen.add([colour.getX(i), colour.getY(i), colour.getZ(i)].join(','))
    expect(seen.size).toBe(2)
    const warm = [...seen].filter((c) => Number(c.split(',')[0]) > Number(c.split(',')[2]))
    expect(warm).toHaveLength(1)
  })
})
