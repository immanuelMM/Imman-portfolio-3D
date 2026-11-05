import { describe, expect, it } from 'vitest'
import { detectSceneMode, type SceneEnv } from './sceneGate'

const ok: SceneEnv = { hasWebGL: () => true, reducedMotion: false, saveData: false }

describe('detectSceneMode', () => {
  it('returns poster without WebGL', () => {
    expect(detectSceneMode({ ...ok, hasWebGL: () => false })).toBe('poster')
  })

  it('returns poster when WebGL detection throws', () => {
    expect(
      detectSceneMode({
        ...ok,
        hasWebGL: () => {
          throw new Error('context creation failed')
        },
      }),
    ).toBe('poster')
  })

  it('returns poster on data saver', () => {
    expect(detectSceneMode({ ...ok, saveData: true })).toBe('poster')
  })

  it('returns poster on low device memory', () => {
    expect(detectSceneMode({ ...ok, deviceMemory: 2 })).toBe('poster')
    expect(detectSceneMode({ ...ok, deviceMemory: 4 })).toBe('scene')
  })

  it('returns still for reduced motion when WebGL works', () => {
    expect(detectSceneMode({ ...ok, reducedMotion: true })).toBe('still')
  })

  it('prefers poster over still when WebGL is missing', () => {
    expect(detectSceneMode({ ...ok, reducedMotion: true, hasWebGL: () => false })).toBe('poster')
  })

  it('returns scene by default', () => {
    expect(detectSceneMode(ok)).toBe('scene')
  })
})
