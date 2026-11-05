import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { credits, creditsFrom } from './credits'

describe('credits', () => {
  it('turns manifest entries into one credit per distinct https source, CC0 shown as "CC0 1.0"', () => {
    const entry = (n: number) => ({
      title: `Asset ${n}`,
      author: 'Someone',
      licence: 'CC0-1.0',
      source: `https://polyhaven.com/a/asset_${n}`,
    })
    const list = creditsFrom([
      entry(1),
      entry(1),
      entry(2),
      { ...entry(3), source: 'src/assets/ai (own work)' },
      { ...entry(4), licence: 'CC BY 4.0' },
    ])
    expect(list.map((c) => c.url)).toEqual([
      'https://polyhaven.com/a/asset_1',
      'https://polyhaven.com/a/asset_2',
      'https://polyhaven.com/a/asset_4',
    ])
    expect(list[0].licence).toBe('CC0 1.0')
    expect(list[2].licence).toBe('CC BY 4.0')
  })

  it('credits the fonts first, then the 3D assets, each with an author and an https link', () => {
    expect(credits[0].what).toMatch(/Inter/)
    for (const c of credits) {
      expect(c.by.length).toBeGreaterThan(1)
      expect(c.url).toMatch(/^https:\/\//)
    }
  })

  it('is rendered by the footer from this list, not typed by hand', () => {
    const footer = readFileSync(path.join(__dirname, '..', 'components', 'Footer.astro'), 'utf8')
    expect(footer).toContain('credits.map')
    expect(footer).toContain("from '../data'")
  })
})
