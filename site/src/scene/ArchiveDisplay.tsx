import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color } from 'three'
import { createHoloMaterial } from './holoMaterial'
import { ARCHIVE_CANVAS, createArchiveTexture } from './archiveCanvas'
import type { Vec3 } from './layout'

const SIZE: [number, number] = [1.7, (1.7 * ARCHIVE_CANVAS.h) / ARCHIVE_CANVAS.w]
const POSITION: Vec3 = [-2.4, 1.75, 3.0]
const YAW = 0.5

/** The `#education` detail group: a floating archive display beside the console, listing education and certifications. */
export default function ArchiveDisplay({ visible }: { visible: boolean }) {
  const motion = useThree((s) => s.frameloop !== 'demand')
  const invalidate = useThree((s) => s.invalidate)
  const parts = useMemo(() => {
    const texture = createArchiveTexture()
    const material = createHoloMaterial(texture, { tint: new Color(0.55, 0.95, 1.0), intensity: 1.5, rim: 0.35 })
    material.uniforms.uActive.value = 0.9
    return { texture, material }
  }, [])
  useEffect(
    () => () => {
      parts.texture.dispose()
      parts.material.dispose()
    },
    [parts],
  )
  useEffect(() => invalidate(), [invalidate, parts])
  useFrame(({ clock }) => {
    parts.material.uniforms.uTime.value = motion ? clock.elapsedTime : 1.7
  })
  const poleHeight = POSITION[1] - SIZE[1] / 2
  return (
    <group position={POSITION} rotation={[0, YAW, 0]} visible={visible}>
      <mesh renderOrder={4} material={parts.material}>
        <planeGeometry args={SIZE} />
      </mesh>
      <mesh position={[0, 0, -0.025]}>
        <boxGeometry args={[SIZE[0] + 0.06, SIZE[1] + 0.06, 0.03]} />
        <meshStandardMaterial color="#070b10" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0, -SIZE[1] / 2 - poleHeight / 2, -0.04]}>
        <boxGeometry args={[0.05, poleHeight, 0.05]} />
        <meshStandardMaterial color="#0c1014" roughness={0.45} metalness={0.8} />
      </mesh>
    </group>
  )
}
