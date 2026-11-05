import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import modelManifest from '../../public/models/manifest.json'
import textureManifest from '../../public/textures/manifest.json'
import { creditsFrom } from '../data/credits'
import { TIER_SETTINGS } from '../lib/quality'

const pub = path.join(__dirname, '..', '..', 'public')
const ALLOWED = ['CC0-1.0', 'CC BY 4.0', 'owned']

describe('3D asset manifests', () => {
  it('lists every shipped model and texture with an allowed licence and a source', () => {
    for (const m of modelManifest.models) {
      expect(ALLOWED).toContain(m.licence)
      expect(m.source).toMatch(/^https:\/\//)
      for (const variant of ['desktop', 'phone']) {
        expect(existsSync(path.join(pub, m.file.replace('{variant}', variant)))).toBe(true)
      }
    }
    for (const t of textureManifest.textures) {
      expect(ALLOWED).toContain(t.licence)
      expect(existsSync(path.join(pub, t.file))).toBe(true)
    }
  })

  it('has no GLB or WebP in public/models and public/textures that the manifests do not list', async () => {
    const { readdirSync } = await import('node:fs')
    const listedModels = new Set(modelManifest.models.map((m) => `${m.name}.glb`))
    for (const variant of ['desktop', 'phone']) {
      for (const f of readdirSync(path.join(pub, 'models', variant))) expect(listedModels.has(f)).toBe(true)
    }
    const listedTextures = new Set(textureManifest.textures.map((t) => path.basename(t.file)))
    for (const f of readdirSync(path.join(pub, 'textures')).filter((n) => n.endsWith('.webp'))) {
      expect(listedTextures.has(f)).toBe(true)
    }
  })

  it('keeps the first-frame assets within budget (desktop 1.5 MB, phone 800 KB)', () => {
    const models = modelManifest.models.filter((m) => m.group === 'room-first')
    const desktopTextures = textureManifest.textures.filter((t) => !/-phone/.test(t.file))
    const phoneTextures = textureManifest.textures.filter((t) => /-phone/.test(t.file))
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
    const desktop = sum(models.map((m) => m.bytes.desktop)) + sum(desktopTextures.map((t) => t.bytes))
    const phone = sum(models.map((m) => m.bytes.phone)) + sum(phoneTextures.map((t) => t.bytes))
    expect(desktop).toBeLessThan(1.5 * 1024 * 1024)
    expect(phone).toBeLessThan(800 * 1024)
    expect(TIER_SETTINGS.low.textureSet).toBe('phone')
  })

  it('builds one credit per distinct source', () => {
    const credits = creditsFrom([...modelManifest.models, ...textureManifest.textures])
    const urls = credits.map((c) => c.url)
    expect(new Set(urls).size).toBe(urls.length)
    expect(credits.every((c) => c.licence === 'CC0 1.0')).toBe(true)
    expect(credits.length).toBeGreaterThanOrEqual(7)
  })
})
