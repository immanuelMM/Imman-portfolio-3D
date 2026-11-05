import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import {
  CircleGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type Vector3Tuple,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three'

export interface EnvLight {
  kind: 'disc' | 'rect'
  position: Vector3Tuple
  /** [width, height] for a rect, [radius] for a disc */
  size: number[]
  colour: string
  intensity: number
  /** the plane faces this way (a point it looks at) */
  look: Vector3Tuple
}

/**
 * Reflections come from a tiny procedural environment (no HDRI, 0 KB): emissive "lightformers" where the ceiling strips,
 * the agent panels and the rack rows are, baked once into a PMREM cube. Positions are relative to a probe at about
 * (0, 1.4, 0.5) in the room, not world positions. A real HDRI of a different room would mirror the wrong things in the
 * floor, the glass and the metal.
 */
export const ROOM_LIGHTS: EnvLight[] = [
  { kind: 'rect', position: [-1.5, 2.3, -2], size: [0.4, 7], colour: '#d8ecff', intensity: 8, look: [-1.5, 0, -2] },
  { kind: 'rect', position: [1.5, 2.3, -2], size: [0.4, 7], colour: '#d8ecff', intensity: 8, look: [1.5, 0, -2] },
  { kind: 'rect', position: [0, 2.3, 3], size: [5, 0.4], colour: '#cfe6ff', intensity: 4, look: [0, 0, 3] },
  { kind: 'rect', position: [0, 0.2, -3.7], size: [6.5, 2], colour: '#5ee7ff', intensity: 2, look: [0, 0.2, 0] },
  { kind: 'rect', position: [-3.5, 0.6, -1], size: [8, 1.6], colour: '#4a6a80', intensity: 0.5, look: [0, 0.6, -1] },
  { kind: 'rect', position: [3.5, 0.6, -1], size: [8, 1.6], colour: '#4a6a80', intensity: 0.5, look: [0, 0.6, -1] },
  { kind: 'rect', position: [0, -1.4, -1], size: [10, 12], colour: '#12222c', intensity: 0.3, look: [0, 1, -1] },
  { kind: 'disc', position: [-3, 0.3, 2], size: [0.1], colour: '#ffb547', intensity: 5, look: [0, 0.3, 2] },
  { kind: 'disc', position: [3, 0.9, 0], size: [0.1], colour: '#4ade80', intensity: 4, look: [0, 0.9, 0] },
]

/** Bakes the lightformers into a PMREM cube once. The caller owns the returned target (dispose it with the room). */
export function buildEnvironment(gl: WebGLRenderer, lights: EnvLight[], ground: string): WebGLRenderTarget {
  const env = new Scene()
  env.background = new Color(ground)
  const disposables: Array<{ dispose(): void }> = []
  for (const light of lights) {
    const geometry =
      light.kind === 'disc' ? new CircleGeometry(light.size[0], 24) : new PlaneGeometry(light.size[0], light.size[1])
    const material = new MeshBasicMaterial({
      color: new Color(light.colour).multiplyScalar(light.intensity),
      side: DoubleSide,
      toneMapped: false,
    })
    const mesh = new Mesh(geometry, material)
    mesh.position.set(...light.position)
    mesh.lookAt(...light.look)
    // a horizontal strip's long side runs along z when it hangs from the ceiling
    env.add(mesh)
    disposables.push(geometry, material)
  }
  const pmrem = new PMREMGenerator(gl)
  const target = pmrem.fromScene(env, 0.03)
  pmrem.dispose()
  disposables.forEach((d) => d.dispose())
  return target
}

/** Sets `scene.environment` to the baked room reflections while mounted. */
export default function Environment({ intensity = 0.7 }: { intensity?: number }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const target = buildEnvironment(gl, ROOM_LIGHTS, '#04070a')
    scene.environment = target.texture
    scene.environmentIntensity = intensity
    return () => {
      scene.environment = null
      target.dispose()
    }
  }, [gl, scene, intensity])
  return null
}
