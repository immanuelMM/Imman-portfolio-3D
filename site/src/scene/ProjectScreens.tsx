import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { BufferGeometry, Color, Float32BufferAttribute, SRGBColorSpace } from 'three'
import { sceneHighlight } from '../lib/sceneHighlights'
import { SCREEN_CELLS } from '../lib/sceneHighlight'
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
  // per-vertex glow of each quad (0..1), eased toward the highlighted cell: lighting a screen costs no extra draw call
  geometry.setAttribute('aGlow', new Float32BufferAttribute(new Float32Array(SCREEN_COLS * SCREEN_ROWS * 4), 1))
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
    const material = createHoloMaterial(atlas, {
      tint: new Color(0.95, 1, 1),
      intensity: 1.8,
      rim: 0,
      vertexGlow: true,
    })
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
  // the project card (hover, focus or tap) that points at one screen
  const pointed = useRef(-1)
  const levels = useRef<number[]>(SCREEN_CELLS.map(() => 0))
  useEffect(
    () =>
      sceneHighlight.subscribe((h) => {
        pointed.current = h?.kind === 'screen' ? SCREEN_CELLS.indexOf(h.id as (typeof SCREEN_CELLS)[number]) : -1
        invalidate()
      }),
    [invalidate],
  )
  useFrame(({ clock }, dt) => {
    parts.material.uniforms.uTime.value = motion ? clock.elapsedTime : 1.7
    const glow = parts.geometry.getAttribute('aGlow') as Float32BufferAttribute
    let changed = false
    levels.current.forEach((level, i) => {
      const want = i === pointed.current ? 1 : 0
      const next =
        Math.abs(want - level) < 0.01 ? want : level + (want - level) * (1 - Math.exp(-Math.min(dt, 0.25) * 10))
      if (next !== level) {
        levels.current[i] = next
        for (let v = 0; v < 4; v++) glow.setX(i * 4 + v, next)
        changed = true
      }
    })
    if (changed) {
      glow.needsUpdate = true
      if (!motion) invalidate()
    }
  })
  return (
    <mesh geometry={parts.geometry} material={parts.material} frustumCulled={false} renderOrder={4} visible={visible} />
  )
}
