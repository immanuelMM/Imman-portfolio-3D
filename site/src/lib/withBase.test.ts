import { describe, expect, it } from 'vitest'
import { withBase } from './withBase'

describe('withBase', () => {
  it('prefixes the project base path', () => {
    expect(withBase('/models/a.glb', '/immanuel-3d/')).toBe('/immanuel-3d/models/a.glb')
  })

  it('is the identity for the root base', () => {
    expect(withBase('/models/a.glb', '/')).toBe('/models/a.glb')
    expect(withBase('/', '/')).toBe('/')
  })

  it('tolerates a base without a trailing slash and a path without a leading slash', () => {
    expect(withBase('about', '/immanuel-3d')).toBe('/immanuel-3d/about')
  })

  it('does not double the slash', () => {
    expect(withBase('//models/a.glb', '/immanuel-3d/')).toBe('//models/a.glb')
    expect(withBase('/#about', '/immanuel-3d/')).toBe('/immanuel-3d/#about')
  })

  it('returns absolute URLs unchanged', () => {
    expect(withBase('https://github.com/immanuelmm', '/immanuel-3d/')).toBe('https://github.com/immanuelmm')
    expect(withBase('mailto:a@b.co', '/immanuel-3d/')).toBe('mailto:a@b.co')
  })
})
