import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { TIER_SETTINGS, type QualityTier } from '../lib/quality'
import { withBase } from '../lib/withBase'

export type MaterialName = 'floor' | 'wall' | 'plate'

export interface MaterialMaps {
  map: Texture
  normalMap: Texture
  /** ambient occlusion (R), roughness (G), metalness (B) packed: assign to aoMap, roughnessMap and metalnessMap */
  arm: Texture
}

export function textureUrl(name: MaterialName, map: 'diff' | 'nor' | 'arm', tier: QualityTier): string {
  const suffix = TIER_SETTINGS[tier].textureSet === 'phone' ? '-phone' : ''
  return withBase(`textures/${name}-${map}${suffix}.webp`)
}

/** The tiling PBR maps of one room material (Poly Haven CC0, built by scripts/build-textures.mjs), repeated `repeat` times. */
export function useMaterialMaps(name: MaterialName, tier: QualityTier, repeat: [number, number]): MaterialMaps {
  const [diff, nor, arm] = useTexture([
    textureUrl(name, 'diff', tier),
    textureUrl(name, 'nor', tier),
    textureUrl(name, 'arm', tier),
  ])
  return useMemo(() => {
    const prepare = (source: Texture, srgb: boolean) => {
      const t = source.clone()
      t.wrapS = t.wrapT = RepeatWrapping
      t.repeat.set(repeat[0], repeat[1])
      t.colorSpace = srgb ? SRGBColorSpace : t.colorSpace
      t.anisotropy = 8
      t.needsUpdate = true
      return t
    }
    return { map: prepare(diff, true), normalMap: prepare(nor, false), arm: prepare(arm, false) }
  }, [diff, nor, arm, repeat])
}
