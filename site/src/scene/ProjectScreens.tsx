import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { BufferGeometry, Color, Float32BufferAttribute, SRGBColorSpace } from 'three'
import { TIER_SETTINGS, type QualityTier } from '../lib/quality'
import { withBase } from '../lib/withBase'
import { createHoloMaterial } from './holoMaterial'
import { cellUv, SCREEN_COLS, SCREEN_ROWS, SCREEN_SIZE, screenPosition } from './screensLayout'

/** Six quads in one geometry: each is one atlas cell, so all the project screens are a single draw call. */
function buildScreensGeometry(): BufferGeometry {
  const [w, h] = SCREEN_SIZE
  const positions: number[] = []
  const uvs: number[] = []
  const index: number[] = []
  for (let i = 0; i < SCREEN_COLS * SCREEN_ROWS; i++) {
    const [cx, cy, cz] = screenPosition(i)
    const [u0, v0, u1, v1] = cellUv(i)
    const base = i * 4
    positions.push(
      cx - w / 2,
      cy - h / 2,
      cz,
      cx + w / 2,
      cy - h / 2,
      cz,
      cx + w / 2,
      cy + h / 2,
      cz,
      cx - w / 2,
      cy + h / 2,
      cz,
    )
    uvs.push(u0, v0, u1, v0, u1, v1, u0, v1)
    index.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(index)
  return geometry
}

/** The `#web` detail group: the six AI project screens (the author's own art) floating above the back rack row. */
export default function ProjectScreens({ tier, visible }: { tier: QualityTier; visible: boolean }) {
  const motion = useThree((s) => s.frameloop !== 'demand')
  const invalidate = useThree((s) => s.invalidate)
  const file = TIER_SETTINGS[tier].textureSet === 'phone' ? 'screens/atlas-phone.webp' : 'screens/atlas.webp'
  const atlas = useTexture(withBase(file))
  const parts = useMemo(() => {
    atlas.colorSpace = SRGBColorSpace
    atlas.anisotropy = 4
    const material = createHoloMaterial(atlas, { tint: new Color(0.95, 1, 1), intensity: 1.8, rim: 0 })
    material.uniforms.uActive.value = 1.0
    return { geometry: buildScreensGeometry(), material }
  }, [atlas])
  useEffect(
    () => () => {
      parts.geometry.dispose()
      parts.material.dispose()
    },
    [parts],
  )
  useEffect(() => invalidate(), [invalidate, parts])
  useFrame(({ clock }) => {
    parts.material.uniforms.uTime.value = motion ? clock.elapsedTime : 1.7
  })
  return (
    <mesh geometry={parts.geometry} material={parts.material} frustumCulled={false} renderOrder={4} visible={visible} />
  )
}
