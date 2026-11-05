import { useEffect, useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import { BoxGeometry, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three'
import { TIER_SETTINGS, type QualityTier } from '../lib/quality'
import { ROOM } from './layout'
import { useMaterialMaps } from './roomTextures'
import { useModel, type PropName } from './useModel'

const FLOOR_REPEAT: [number, number] = [6, 8.5]
const BACK_REPEAT: [number, number] = [9, 2.6]
const SIDE_REPEAT: [number, number] = [13, 2.6]

const LENGTH = ROOM.front - ROOM.back
const CENTRE_Z = (ROOM.front + ROOM.back) / 2

function Floor({ tier }: { tier: QualityTier }) {
  const settings = TIER_SETTINGS[tier]
  const maps = useMaterialMaps('floor', tier, FLOOR_REPEAT)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, CENTRE_Z]} receiveShadow>
      <planeGeometry args={[ROOM.halfWidth * 2, LENGTH]} />
      {settings.reflector ? (
        <MeshReflectorMaterial
          map={maps.map}
          normalMap={maps.normalMap}
          roughnessMap={maps.arm}
          normalScale={[0.45, 0.45]}
          color="#aab6c2"
          roughness={0.4}
          metalness={0.3}
          blur={[220, 60]}
          mixBlur={0.8}
          mixStrength={5}
          mixContrast={1.1}
          mirror={0.85}
          resolution={512}
          depthScale={0.6}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.4}
          reflectorOffset={0.001}
        />
      ) : (
        <meshStandardMaterial
          map={maps.map}
          normalMap={maps.normalMap}
          roughnessMap={maps.arm}
          metalnessMap={maps.arm}
          normalScale={[0.45, 0.45]}
          color="#7f8c99"
          roughness={0.5}
          metalness={0.3}
          envMapIntensity={1.4}
        />
      )}
    </mesh>
  )
}

function Walls({ tier }: { tier: QualityTier }) {
  const back = useMaterialMaps('wall', tier, BACK_REPEAT)
  const side = useMaterialMaps('wall', tier, SIDE_REPEAT)
  const common = {
    color: '#36404a',
    roughness: 0.6,
    metalness: 0.7,
    envMapIntensity: 0.9,
  } as const
  return (
    <group>
      <mesh position={[0, ROOM.height / 2, ROOM.back]} receiveShadow>
        <planeGeometry args={[ROOM.halfWidth * 2, ROOM.height]} />
        <meshStandardMaterial
          {...common}
          map={back.map}
          normalMap={back.normalMap}
          roughnessMap={back.arm}
          metalnessMap={back.arm}
        />
      </mesh>
      <mesh position={[-ROOM.halfWidth, ROOM.height / 2, CENTRE_Z]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[LENGTH, ROOM.height]} />
        <meshStandardMaterial
          {...common}
          map={side.map}
          normalMap={side.normalMap}
          roughnessMap={side.arm}
          metalnessMap={side.arm}
        />
      </mesh>
      <mesh position={[ROOM.halfWidth, ROOM.height / 2, CENTRE_Z]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[LENGTH, ROOM.height]} />
        <meshStandardMaterial
          {...common}
          map={side.map}
          normalMap={side.normalMap}
          roughnessMap={side.arm}
          metalnessMap={side.arm}
        />
      </mesh>
      <mesh position={[0, ROOM.height, CENTRE_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.halfWidth * 2, LENGTH]} />
        <meshStandardMaterial color="#10161d" roughness={0.9} metalness={0.3} />
      </mesh>
    </group>
  )
}

/** Ceiling steel: cross beams, two cable-tray runs with rungs and four cool light strips (emissive, so they bloom). */
function CeilingGear({ tier }: { tier: QualityTier }) {
  const plate = useMaterialMaps('plate', tier, [1, 1])
  const parts = useMemo(() => {
    const q = new Quaternion()
    const m = new Matrix4()
    const one = new Vector3(1, 1, 1)
    const box = new BoxGeometry(1, 1, 1)
    const beams = new InstancedMesh(box, undefined, 7)
    for (let i = 0; i < 7; i++) {
      beams.setMatrixAt(
        i,
        m.compose(new Vector3(0, ROOM.height - 0.16, 9 - i * 2.6), q, new Vector3(ROOM.halfWidth * 2, 0.26, 0.2)),
      )
    }
    const rungCount = 70
    const rungs = new InstancedMesh(box, undefined, rungCount * 2)
    for (let run = 0; run < 2; run++) {
      const x = run === 0 ? -2.7 : 2.7
      for (let i = 0; i < rungCount; i++) {
        rungs.setMatrixAt(
          run * rungCount + i,
          m.compose(new Vector3(x, ROOM.height - 0.62, 9.5 - i * 0.26), q, new Vector3(0.42, 0.02, 0.035)),
        )
      }
    }
    const rails = new InstancedMesh(box, undefined, 4)
    ;[-2.9, -2.5, 2.5, 2.9].forEach((x, i) => {
      rails.setMatrixAt(
        i,
        m.compose(new Vector3(x, ROOM.height - 0.62, CENTRE_Z + 1.0), q, new Vector3(0.035, 0.07, LENGTH - 2)),
      )
    })
    const lightMat = new MeshBasicMaterial({ color: new Color(2.4, 3.0, 3.6), toneMapped: false })
    const strips = new InstancedMesh(box, lightMat, 4)
    ;[-1.35, 1.35].forEach((x, i) => {
      strips.setMatrixAt(i, m.compose(new Vector3(x, ROOM.height - 0.04, -1.5), q, new Vector3(0.22, 0.04, 6.5)))
    })
    ;[-3, 3].forEach((z, i) => {
      strips.setMatrixAt(2 + i, m.compose(new Vector3(0, ROOM.height - 0.04, z), q, new Vector3(2.2, 0.04, 0.22)))
    })
    for (const mesh of [beams, rungs, rails, strips]) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.frustumCulled = false
    }
    one.set(1, 1, 1)
    return {
      beams,
      rungs,
      rails,
      strips,
      dispose: () => {
        box.dispose()
        lightMat.dispose()
        for (const mesh of [beams, rungs, rails, strips]) mesh.dispose()
      },
    }
  }, [])
  useEffect(() => () => parts.dispose(), [parts])
  const steel = (
    <meshStandardMaterial
      attach="material"
      color="#3a4552"
      map={plate.map}
      normalMap={plate.normalMap}
      roughness={0.6}
      metalness={0.85}
    />
  )
  return (
    <group>
      <primitive object={parts.beams}>{steel}</primitive>
      <primitive object={parts.rungs}>{steel}</primitive>
      <primitive object={parts.rails}>{steel}</primitive>
      <primitive object={parts.strips} />
    </group>
  )
}

interface PropProps {
  name: PropName
  tier: QualityTier
  position: [number, number, number]
  rotationY?: number
  scale?: number
  envMapIntensity?: number
}

function Prop({ name, tier, position, rotationY = 0, scale = 1, envMapIntensity = 0.8 }: PropProps) {
  const object = useModel(name, tier, { envMapIntensity, cast: false })
  return <primitive object={object} position={position} rotation={[0, rotationY, 0]} scale={scale} />
}

/** Poly Haven CC0 props: ducts under the ceiling, wall boxes, an extinguisher, a smoke alarm and a corner camera. */
export function WallProps({ tier }: { tier: QualityTier }) {
  const back = ROOM.back
  return (
    <group>
      <Prop name="powerbox" tier={tier} position={[-5.25, 1.5, back + 0.02]} />
      <Prop name="utilitybox" tier={tier} position={[-5.75, 0, back + 0.3]} />
      <Prop name="utilitybox" tier={tier} position={[5.7, 0, back + 0.3]} rotationY={0.0} />
      <Prop name="extinguisher" tier={tier} position={[4.7, 0, back + 0.25]} />
      <Prop name="firealarm" tier={tier} position={[5.05, 2.0, back + 0.02]} />
      <Prop name="camera" tier={tier} position={[4.2, 3.3, back + 0.1]} rotationY={Math.PI} />
    </group>
  )
}

export default function Room({ tier }: { tier: QualityTier }) {
  return (
    <group>
      <Floor tier={tier} />
      <Walls tier={tier} />
      <CeilingGear tier={tier} />
    </group>
  )
}
