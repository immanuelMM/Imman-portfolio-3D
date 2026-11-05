import { useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type CanvasTexture,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { type QualityTier } from '../lib/quality'
import { buildConsoleDetail, buildEdgeLight, cableGeometry, cableSpecs } from './consoleDetail'
import { createKeyboardTexture, createScreenTexture } from './consoleTextures'
import { excludeFromReflection } from './layers'
import { CONSOLE } from './layout'
import { useMaterialMaps } from './roomTextures'

const PLATE_REPEAT: [number, number] = [2, 1]
const SCREEN_GLOW = new Color(1.5, 1.5, 1.5)

interface MonitorSpec {
  x: number
  yaw: number
  w: number
  h: number
}

const MONITORS: MonitorSpec[] = [
  { x: -0.66, yaw: 0.4, w: 0.5, h: 0.34 },
  { x: 0, yaw: 0, w: 0.7, h: 0.4 },
  { x: 0.66, yaw: -0.4, w: 0.5, h: 0.34 },
]
const TILT = -0.12

/** Matrix of a monitor's group (position on the desk, turned toward the operator). */
function monitorMatrix(m: MonitorSpec): Matrix4 {
  const z = -0.18 + Math.abs(m.x) * 0.1
  return new Matrix4().compose(
    new Vector3(m.x, 0.82, z),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), m.yaw),
    new Vector3(1, 1, 1),
  )
}

/** Three monitors: stands, bases and bezels are three instanced meshes (3 draw calls), the screens one plane each. */
function Monitors({ screens }: { screens: CanvasTexture[] }) {
  const parts = useMemo(() => {
    const box = new BoxGeometry(1, 1, 1)
    const stands = new InstancedMesh(box, undefined, MONITORS.length)
    const bases = new InstancedMesh(box, undefined, MONITORS.length)
    const bezels = new InstancedMesh(box, undefined, MONITORS.length)
    const local = new Matrix4()
    const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), TILT)
    MONITORS.forEach((m, i) => {
      const g = monitorMatrix(m)
      const at = (position: Vector3, rotation: Quaternion, scale: Vector3) =>
        local.compose(position, rotation, scale).premultiply(g)
      stands.setMatrixAt(i, at(new Vector3(0, 0.05, 0), new Quaternion(), new Vector3(0.05, 0.1, 0.05)))
      bases.setMatrixAt(i, at(new Vector3(0, 0, 0.01), new Quaternion(), new Vector3(0.3, 0.012, 0.18)))
      bezels.setMatrixAt(i, at(new Vector3(0, 0.1 + m.h / 2, 0), tilt, new Vector3(m.w + 0.04, m.h + 0.04, 0.035)))
    })
    for (const mesh of [stands, bases, bezels]) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.frustumCulled = false
    }
    return { box, stands, bases, bezels }
  }, [])
  useEffect(
    () => () => {
      parts.box.dispose()
      for (const mesh of [parts.stands, parts.bases, parts.bezels]) mesh.dispose()
    },
    [parts],
  )
  return (
    <group>
      <primitive object={parts.stands}>
        <meshStandardMaterial attach="material" color="#0c1014" roughness={0.45} metalness={0.8} />
      </primitive>
      <primitive object={parts.bases}>
        <meshStandardMaterial attach="material" color="#0c1014" roughness={0.45} metalness={0.8} />
      </primitive>
      <primitive object={parts.bezels}>
        <meshStandardMaterial attach="material" color="#080b0e" roughness={0.4} metalness={0.7} />
      </primitive>
      {MONITORS.map((m, i) => {
        // the screen sits on the bezel's front face, inside the tilted group
        const g = monitorMatrix(m)
        const position = new Vector3(0, 0, 0.02)
          .applyAxisAngle(new Vector3(1, 0, 0), TILT)
          .add(new Vector3(0, 0.1 + m.h / 2, 0))
          .applyMatrix4(g)
        const rotation = new Euler().setFromQuaternion(
          new Quaternion()
            .setFromRotationMatrix(g)
            .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), TILT)),
        )
        return (
          <mesh key={i} position={position} rotation={rotation}>
            <planeGeometry args={[m.w, m.h]} />
            <meshBasicMaterial
              map={screens[i]}
              color={SCREEN_GLOW}
              toneMapped={false}
              polygonOffset
              polygonOffsetFactor={-4}
              polygonOffsetUnits={-4}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/** Three cables lying in the tray: one InstancedMesh with an instance colour each. */
function useCables(bw: number, bh: number, bd: number): InstancedMesh {
  return useMemo(() => {
    const specs = cableSpecs(bd, bh)
    const material = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 })
    const mesh = new InstancedMesh(cableGeometry(bw - 0.32), material, specs.length)
    const m = new Matrix4()
    const colour = new Color()
    specs.forEach((c, i) => {
      mesh.setMatrixAt(i, m.makeTranslation(0, c.y, c.z))
      mesh.setColorAt(i, colour.setRGB(...c.colour))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.frustumCulled = false
    return excludeFromReflection(mesh)
  }, [bw, bh, bd])
}

/**
 * The operator console: a steel desk (Poly Haven plate PBR) under a bevelled satin-black desktop with a clear coat, a trim
 * band, a cable tray with three cables under the front overhang, a backlit keyboard with its wrist rest, a mouse, three
 * monitors, and an under-lit front edge that is cool cyan with a short warm amber run. The small hardware is two draw calls
 * in all (merged geometry + cables), neither drawn in the floor's mirror pass.
 */
export default function Console({ tier }: { tier: QualityTier }) {
  const plate = useMaterialMaps('plate', tier, PLATE_REPEAT)
  const [bw, bh, bd] = CONSOLE.size
  const bodyGeo = useMemo(() => new RoundedBoxGeometry(bw, bh, bd, 3, 0.03), [bw, bh, bd])
  const topGeo = useMemo(() => new RoundedBoxGeometry(bw + 0.1, 0.05, bd + 0.1, 4, 0.024), [bw, bd])
  const detailGeo = useMemo(() => buildConsoleDetail(bw, bh, bd), [bw, bh, bd])
  const edgeGeo = useMemo(() => buildEdgeLight(bw, bd), [bw, bd])
  const cables = useCables(bw, bh, bd)
  const detail = useMemo(() => {
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.75 })
    const mesh = new Mesh(detailGeo, material)
    mesh.frustumCulled = false
    return excludeFromReflection(mesh)
  }, [detailGeo])
  const screens = useMemo(() => [createScreenTexture(0), createScreenTexture(1), createScreenTexture(2)], [])
  const keyboard = useMemo(() => createKeyboardTexture(), [])
  useEffect(
    () => () => {
      bodyGeo.dispose()
      topGeo.dispose()
      detailGeo.dispose()
      edgeGeo.dispose()
      cables.geometry.dispose()
      ;(cables.material as MeshStandardMaterial).dispose()
      cables.dispose()
      ;(detail.material as MeshStandardMaterial).dispose()
      screens.forEach((s) => s.dispose())
      keyboard.dispose()
    },
    [bodyGeo, topGeo, detailGeo, edgeGeo, cables, detail, screens, keyboard],
  )
  const [px, , pz] = CONSOLE.position
  const kbZ = bd / 2 - 0.16
  return (
    <group position={[px, 0, pz]}>
      <mesh geometry={bodyGeo} position={[0, bh / 2, 0]} receiveShadow>
        <meshStandardMaterial
          color="#6a7b8c"
          normalMap={plate.normalMap}
          normalScale={[0.35, 0.35]}
          roughnessMap={plate.arm}
          roughness={0.62}
          metalness={0.3}
        />
      </mesh>
      <mesh geometry={topGeo} position={[0, bh + 0.02, 0]} receiveShadow>
        <meshPhysicalMaterial
          color="#05070a"
          normalMap={plate.normalMap}
          normalScale={[0.12, 0.12]}
          roughness={0.34}
          metalness={0.45}
          clearcoat={0.7}
          clearcoatRoughness={0.12}
          envMapIntensity={1.2}
        />
      </mesh>
      <primitive object={detail} />
      <primitive object={cables} />
      {/* under-lit front edge: a cyan run and an amber run */}
      <mesh geometry={edgeGeo}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      {/* backlit keys, warm white, on top of the keyboard body */}
      <mesh position={[0, bh + 0.0672, kbZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.16]} />
        <meshStandardMaterial
          map={keyboard}
          roughness={0.5}
          metalness={0.2}
          emissive="#ffb868"
          emissiveMap={keyboard}
          emissiveIntensity={0.55}
        />
      </mesh>
      <Monitors screens={screens} />
    </group>
  )
}
