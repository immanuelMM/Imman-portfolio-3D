/**
 * Decides, before any three.js is downloaded, what the hero scene renders:
 * - poster: SVG poster only (no WebGL, data saver, or a weak device)
 * - still: one 3D frame at the hero pose (prefers-reduced-motion)
 * - scene: the full animated scene
 */
export type SceneMode = 'scene' | 'still' | 'poster'

export interface SceneEnv {
  hasWebGL: () => boolean
  reducedMotion: boolean
  saveData: boolean
  deviceMemory?: number
}

export function detectSceneMode(env: SceneEnv): SceneMode {
  try {
    if (!env.hasWebGL()) return 'poster'
  } catch {
    return 'poster'
  }
  if (env.saveData) return 'poster'
  if (env.deviceMemory !== undefined && env.deviceMemory <= 2) return 'poster'
  if (env.reducedMotion) return 'still'
  return 'scene'
}

/** Creates (and immediately releases) a throwaway context, so a broken GPU stack is caught before we load three. */
export function browserHasWebGL(): boolean {
  const canvas = document.createElement('canvas')
  const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
  if (!gl) return false
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return true
}

interface NavigatorHints {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

export function readBrowserEnv(): SceneEnv {
  const nav = navigator as Navigator & NavigatorHints
  return {
    hasWebGL: browserHasWebGL,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: nav.connection?.saveData === true,
    deviceMemory: nav.deviceMemory,
  }
}
