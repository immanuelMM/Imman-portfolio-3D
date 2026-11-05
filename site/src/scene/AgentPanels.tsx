import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  type ShaderMaterial as ShaderMaterialType,
} from 'three'
import { agents } from '../data/agents'
import { TIER_SETTINGS, type QualityTier } from '../lib/quality'
import { createHoloMaterial } from './holoMaterial'
import { AGENT_PANELS, PANEL_FLOOR_GAP } from './layout'
import { drawAgentPanel, loadPanelFonts, PANEL_CANVAS } from './panelCanvas'
import { flicker } from './flicker'
import { useMaterialMaps } from './roomTextures'

let fontsDone = false
let fontsPromise: Promise<void> | null = null
/** Suspends the scene until the page fonts are in (or 1.5 s), so the panel text is drawn in the right faces. */
function useFontsReady() {
  if (fontsDone) return
  fontsPromise ??= Promise.race([loadPanelFonts(), new Promise<void>((r) => setTimeout(r, 1500))]).then(() => {
    fontsDone = true
  })
  throw fontsPromise
}

const spillVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }
`
const spillFragment = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColour;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.2);
    gl_FragColor = vec4(uColour * a, 1.0);
    #include <colorspace_fragment>
  }
`

const beamFragment = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColour;
  void main() {
    float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float a = pow(across, 1.6) * (1.0 - vUv.y) * 0.55;
    gl_FragColor = vec4(uColour * a, 1.0);
    #include <colorspace_fragment>
  }
`
const beamVertex = spillVertex

interface Props {
  tier: QualityTier
  motion: boolean
}

const PLATE_REPEAT: [number, number] = [1, 1]

/** The seven agent panels: floating glass slabs on projector bases, each with its drawn holographic face. */
export default function AgentPanels({ tier, motion }: Props) {
  useFontsReady()
  const invalidate = useThree((s) => s.invalidate)
  const plate = useMaterialMaps('plate', tier, PLATE_REPEAT)
  const settings = TIER_SETTINGS[tier]
  void settings

  const holo = useMemo(() => {
    const scale = tier === 'low' ? 0.5 : 1
    return AGENT_PANELS.map((panel, i) => {
      const agent = agents.find((a) => a.id === panel.agentId)!
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(PANEL_CANVAS.w * scale)
      canvas.height = Math.round(PANEL_CANVAS.h * scale)
      const ctx = canvas.getContext('2d')!
      ctx.scale(scale, scale)
      drawAgentPanel(ctx, agent, agents.findIndex((a) => a.id === panel.agentId) ?? i)
      const texture = new CanvasTexture(canvas)
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = 8
      const material = createHoloMaterial(texture, { tint: new Color(0.55, 0.95, 1.0), intensity: 1.7 })
      return { panel, material, texture }
    })
  }, [tier])

  const parts = useMemo(() => {
    const n = AGENT_PANELS.length
    const q = new Quaternion()
    const up = new Vector3(0, 1, 0)
    const m = new Matrix4()
    const local = new Matrix4()
    const one = new Vector3(1, 1, 1)

    const glassGeo = new BoxGeometry(1, 1, 0.03)
    const glass = new InstancedMesh(glassGeo, undefined, n)
    const barGeo = new BoxGeometry(1, 1, 1)
    const bars = new InstancedMesh(barGeo, new MeshBasicMaterial({ toneMapped: false }), n * 4)
    const baseGeo = new CylinderGeometry(0.44, 0.52, 0.09, 40)
    const bases = new InstancedMesh(baseGeo, undefined, n)
    const ringGeo = new RingGeometry(0.34, 0.4, 48)
    ringGeo.rotateX(-Math.PI / 2)
    const rings = new InstancedMesh(ringGeo, new MeshBasicMaterial({ toneMapped: false }), n)
    const beamGeo = new PlaneGeometry(0.7, PANEL_FLOOR_GAP + 0.02)
    const beamMat = new ShaderMaterial({
      uniforms: { uColour: { value: new Color(0.25, 0.9, 1.0) } },
      vertexShader: beamVertex,
      fragmentShader: beamFragment,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    })
    const beams = new InstancedMesh(beamGeo, beamMat, n)
    const spillGeo = new CircleGeometry(1.7, 40)
    spillGeo.rotateX(-Math.PI / 2)
    const spillMat = new ShaderMaterial({
      uniforms: { uColour: { value: new Color(0.1, 0.62, 0.8) } },
      vertexShader: spillVertex,
      fragmentShader: spillFragment,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const spills = new InstancedMesh(spillGeo, spillMat, n)

    const col = new Color()
    AGENT_PANELS.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rotationY)
      const panelM = new Matrix4().compose(new Vector3(...p.position), q, one)
      const [w, h] = p.size
      glass.setMatrixAt(i, m.compose(new Vector3(...p.position), q, new Vector3(w, h, 1)))
      const lead = p.agentId === 'lead'
      const bright = lead ? 2.2 : 0.8
      const edge = (k: number, x: number, y: number, sx: number, sy: number) => {
        bars.setMatrixAt(
          i * 4 + k,
          local.compose(new Vector3(x, y, 0.018), new Quaternion(), new Vector3(sx, sy, 0.02)).premultiply(panelM),
        )
        bars.setColorAt(i * 4 + k, col.setRGB(0.3 * bright, 0.95 * bright, 1.0 * bright))
      }
      edge(0, 0, h / 2, w + 0.02, 0.018)
      edge(1, 0, -h / 2, w + 0.02, 0.018)
      edge(2, -w / 2, 0, 0.018, h)
      edge(3, w / 2, 0, 0.018, h)

      const floorPos = new Vector3(p.position[0], 0, p.position[2])
      // the projector base sits directly under the glass
      bases.setMatrixAt(i, m.compose(floorPos.clone().setY(0.045), new Quaternion(), one))
      rings.setMatrixAt(i, m.compose(floorPos.clone().setY(0.094), new Quaternion(), one))
      rings.setColorAt(i, col.setRGB(0.3 * bright, 1.0 * bright, 1.15 * bright))
      beams.setMatrixAt(
        i,
        local.makeTranslation(0, PANEL_FLOOR_GAP / 2 + 0.09, 0).premultiply(m.compose(floorPos, q, one)),
      )
      spills.setMatrixAt(
        i,
        m.compose(floorPos.clone().setY(0.012), new Quaternion(), new Vector3(lead ? 1.25 : 1, 1, lead ? 1.25 : 1)),
      )
    })
    for (const mesh of [glass, bars, bases, rings, beams, spills]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.frustumCulled = false
    }
    spills.renderOrder = 1
    beams.renderOrder = 3
    glass.renderOrder = 2
    return {
      glass,
      bars,
      bases,
      rings,
      beams,
      spills,
      dispose: () => {
        for (const g of [glassGeo, barGeo, baseGeo, ringGeo, beamGeo, spillGeo]) g.dispose()
        beamMat.dispose()
        spillMat.dispose()
        ;(bars.material as MeshBasicMaterial).dispose()
        ;(rings.material as MeshBasicMaterial).dispose()
        for (const mesh of [glass, bars, bases, rings, beams, spills]) mesh.dispose()
      },
    }
  }, [])

  useEffect(() => () => parts.dispose(), [parts])
  useEffect(
    () => () =>
      holo.forEach((h) => {
        h.material.dispose()
        h.texture.dispose()
      }),
    [holo],
  )
  useEffect(() => invalidate(), [invalidate, holo])

  const materials = useRef<ShaderMaterialType[]>([])
  materials.current = holo.map((h) => h.material)
  useFrame(({ clock }) => {
    const t = motion ? clock.elapsedTime : 1.7
    materials.current.forEach((mat, i) => {
      const lead = AGENT_PANELS[i].agentId === 'lead'
      const base = lead ? 1.0 : 0.6
      mat.uniforms.uTime.value = t
      mat.uniforms.uActive.value = base + (motion ? 0.1 * Math.sin(t * 1.2 + i * 1.7) : 0)
      mat.uniforms.uFlicker.value = motion ? flicker(t, i) : 1
    })
  })

  return (
    <group>
      <primitive object={parts.spills} />
      <primitive object={parts.bases} castShadow receiveShadow>
        <meshStandardMaterial
          attach="material"
          color="#7d8a98"
          map={plate.map}
          normalMap={plate.normalMap}
          roughnessMap={plate.arm}
          metalnessMap={plate.arm}
          roughness={0.5}
          metalness={0.9}
        />
      </primitive>
      <primitive object={parts.rings} />
      <primitive object={parts.beams} />
      <primitive object={parts.glass}>
        <meshPhysicalMaterial
          attach="material"
          color="#0a1c26"
          roughness={0.08}
          metalness={0.0}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.42}
          envMapIntensity={1.6}
          depthWrite={false}
        />
      </primitive>
      <primitive object={parts.bars} />
      {holo.map(({ panel, material }) => {
        const nx = Math.sin(panel.rotationY)
        const nz = Math.cos(panel.rotationY)
        return (
          <mesh
            key={panel.agentId}
            position={[panel.position[0] + nx * 0.02, panel.position[1], panel.position[2] + nz * 0.02]}
            rotation={[0, panel.rotationY, 0]}
            renderOrder={4}
            material={material}
          >
            <planeGeometry args={panel.size} />
          </mesh>
        )
      })}
    </group>
  )
}
