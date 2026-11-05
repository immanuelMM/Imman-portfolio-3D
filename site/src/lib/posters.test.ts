import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(__dirname, '..', '..')
const publicDir = path.join(root, 'public')
const POSTER_BUDGET = 120 * 1024

const crops = ['desktop', 'tablet', 'phone']
const posters = crops.map((crop) => `poster/poster-hero-${crop}.webp`)

describe('hero posters (real renders of the reduced-motion still)', () => {
  for (const file of posters) {
    it(`${file} exists, is a WebP and fits the 120 KB poster budget`, () => {
      const full = path.join(publicDir, file)
      expect(existsSync(full), file).toBe(true)
      expect(statSync(full).size).toBeLessThanOrEqual(POSTER_BUDGET)
      const head = readFileSync(full).subarray(0, 12).toString('latin1')
      expect(head.slice(0, 4)).toBe('RIFF')
      expect(head.slice(8, 12)).toBe('WEBP')
    })
  }

  it('has no other file in poster/ (nothing shipped that the page does not use)', async () => {
    const { readdirSync } = await import('node:fs')
    const listed = new Set(posters.map((p) => path.basename(p)))
    for (const f of readdirSync(path.join(publicDir, 'poster'))) expect(listed.has(f), f).toBe(true)
  })

  it('has an og.png for link previews, 1200x630', () => {
    const full = path.join(publicDir, 'og.png')
    expect(existsSync(full)).toBe(true)
    const bytes = readFileSync(full)
    expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG')
    // IHDR: width and height are big-endian u32 at offsets 16 and 20
    expect(bytes.readUInt32BE(16)).toBe(1200)
    expect(bytes.readUInt32BE(20)).toBe(630)
    expect(bytes.length).toBeLessThan(400 * 1024)
  })

  it('references every crop from the poster component, through withBase', () => {
    const source = readFileSync(path.join(root, 'src', 'components', 'ScenePoster.astro'), 'utf8')
    for (const file of posters) expect(source).toContain(`withBase('${file}')`)
  })

  it('replaces the CSS stand-in: the poster layer paints the image, with a crop per aspect', () => {
    const css = readFileSync(path.join(root, 'src', 'styles', 'features.css'), 'utf8')
    expect(css).not.toContain('radial-gradient(ellipse 60% 40% at 50% 38%')
    for (const crop of ['landscape', 'tablet', 'phone']) expect(css).toContain(`--poster-${crop}`)
    expect(css).toMatch(/\.scene-poster\s*\{[^}]*cover/)
  })

  it('is the image the page shows in its og:image tag', () => {
    const base = readFileSync(path.join(root, 'src', 'lib', 'seo.ts'), 'utf8')
    expect(base).toContain('og.png')
  })
})
