import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'
import { TIER_SETTINGS, type QualityTier } from '../lib/quality'
import { RACKS, RACK_SIZE } from './layout'
import { buildLedInstances, rng } from './leds'
import { createRackTextures } from './rackTexture'
import { useMaterialMaps } from './roomTextures'

const PLATE_REPEAT: [number, number] = [1, 3]

const ledVertex = /* glsl */ `
  attribute float aPhase;
  attribute vec3 aColour;
  varying vec2 vUv;
  varying vec3 vColour;
  varying float vPhase;
  void main() {
    vUv = uv;
    vColour = aColour;
    vPhase = aPhase;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`

const ledFragment = /* glsl */ `
  uniform float uTime;
  uniform float uMotion;
  varying vec2 vUv;
  varying vec3 vColour;
  varying float vPhase;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = smoothstep(0.34, 0.2, d);
    float halo = exp(-d * d * 7.0) * 0.4;
    // roughly half the lamps are steady; the rest blink at their own rate (static pattern under reduced motion)
    float blinks = step(0.5, vPhase);
    float wave = step(0.0, sin(uTime * (2.0 + vPhase * 11.0) + vPhase * 60.0)) * 0.85 + 0.15;
    float still = step(0.25, fract(vPhase * 7.0)) * 0.9 + 0.1;
    float on = mix(1.0, mix(still, wave, uMotion), blinks);
    vec3 col = vColour * (core * 3.2 + halo) * on;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

interface RacksProps {
  tier: QualityTier
  motion: boolean
}

/**
 * The rack rows: one instanced body, one instanced front (drawn texture + normal map), and one instanced quad per status
 * lamp that blinks in a shader. About 40 racks cost 3 draw calls.
 */
export default function Racks({ tier, motion }: RacksProps) {
  const settings = TIER_SETTINGS[tier]
  const plate = useMaterialMaps('plate', tier, PLATE_REPEAT)

  const { bodies, fronts, ledMesh, material, dispose } = useMemo(() => {
    const n = RACKS.length
    const bodyGeo = new BoxGeometry(RACK_SIZE.w, RACK_SIZE.h, RACK_SIZE.d)
    const frontGeo = new PlaneGeometry(RACK_SIZE.w, RACK_SIZE.h)
    const bodies = new InstancedMesh(bodyGeo, undefined, n)
    const fronts = new InstancedMesh(frontGeo, undefined, n)
    const m = new Matrix4()
    const local = new Matrix4()
    const q = new Quaternion()
    const up = new Vector3(0, 1, 0)
    const rnd = rng(5)
    const tint = new Color()
    RACKS.forEach((rack, i) => {
      q.setFromAxisAngle(up, rack.yaw)
      m.compose(new Vector3(...rack.position), q, new Vector3(1, 1, 1))
      bodies.setMatrixAt(i, local.makeTranslation(0, RACK_SIZE.h / 2, 0).premultiply(m))
      fronts.setMatrixAt(i, local.makeTranslation(0, RACK_SIZE.h / 2, RACK_SIZE.d / 2 + 0.003).premultiply(m))
      const v = 0.78 + rnd() * 0.32
      tint.setRGB(v, v, v * 1.02)
      fronts.setColorAt(i, tint)
      bodies.setColorAt(i, tint)
    })
    bodies.instanceMatrix.needsUpdate = true
    fronts.instanceMatrix.needsUpdate = true
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true
    if (fronts.instanceColor) fronts.instanceColor.needsUpdate = true
    bodies.frustumCulled = false
    fronts.frustumCulled = false

    const leds = buildLedInstances(settings.ledCount, 42)
    const ledGeo = new PlaneGeometry(0.065, 0.065)
    ledGeo.setAttribute('aPhase', new InstancedBufferAttribute(leds.phases, 1))
    ledGeo.setAttribute('aColour', new InstancedBufferAttribute(leds.colours, 3))
    const material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMotion: { value: 1 } },
      vertexShader: ledVertex,
      fragmentShader: ledFragment,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const ledMesh = new InstancedMesh(ledGeo, material, leds.phases.length)
    ledMesh.instanceMatrix.array.set(leds.matrices)
    ledMesh.instanceMatrix.needsUpdate = true
    ledMesh.frustumCulled = false
    ledMesh.renderOrder = 5
    return {
      bodies,
      fronts,
      ledMesh,
      material,
      dispose: () => {
        bodyGeo.dispose()
        frontGeo.dispose()
        ledGeo.dispose()
        material.dispose()
        bodies.dispose()
        fronts.dispose()
        ledMesh.dispose()
      },
    }
  }, [settings.ledCount])

  const textures = useMemo(() => createRackTextures(tier === 'low' ? 0.5 : 1), [tier])
  useEffect(() => () => dispose(), [dispose])
  useEffect(
    () => () => {
      textures.map.dispose()
      textures.normalMap.dispose()
    },
    [textures],
  )

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = motion ? clock.elapsedTime : 3.1
    material.uniforms.uMotion.value = motion ? 1 : 0
  })

  return (
    <group>
      <primitive object={bodies} castShadow receiveShadow>
        <meshStandardMaterial
          attach="material"
          color="#b9c5d1"
          map={plate.map}
          normalMap={plate.normalMap}
          roughnessMap={plate.arm}
          metalnessMap={plate.arm}
          roughness={0.6}
          metalness={0.5}
          envMapIntensity={0.8}
        />
      </primitive>
      <primitive object={fronts} receiveShadow>
        <meshStandardMaterial
          attach="material"
          map={textures.map}
          normalMap={textures.normalMap}
          normalScale={[1.2, 1.2]}
          roughness={0.5}
          metalness={0.55}
          envMapIntensity={1.0}
        />
      </primitive>
      <primitive object={ledMesh} />
    </group>
  )
}
