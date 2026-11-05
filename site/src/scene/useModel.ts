import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { withBase } from '../lib/withBase'
import { TIER_SETTINGS, type QualityTier } from '../lib/quality'
import { excludeFromReflection } from './layers'

/** GLBs are Meshopt-compressed (build-models.mjs); no Draco loader is shipped. */
const extend = (loader: GLTFLoader) => {
  loader.setMeshoptDecoder(MeshoptDecoder)
}

export type PropName = 'camera' | 'powerbox' | 'extinguisher' | 'firealarm' | 'utilitybox'

export function modelUrl(name: PropName, tier: QualityTier): string {
  return withBase(`models/${TIER_SETTINGS[tier].textureSet}/${name}.glb`)
}

export interface ModelOptions {
  cast?: boolean
  receive?: boolean
  /** multiplies the scene environment on this prop's materials */
  envMapIntensity?: number
  /** false: draw it only in the main view, not in the mirror floor's reflection pass (saves a draw call per mesh) */
  reflected?: boolean
}

/** The decoded GLB (Meshopt) as an independent clone, so one file can appear several times with its own transforms. */
export function useModel(name: PropName, tier: QualityTier, options: ModelOptions = {}): Object3D {
  const { cast = true, receive = true, envMapIntensity = 1, reflected = true } = options
  const gltf = useLoader(GLTFLoader, modelUrl(name, tier), extend)
  return useMemo(() => {
    const clone = cloneSkinned(gltf.scene)
    clone.traverse((node) => {
      if (!(node instanceof Mesh)) return
      node.castShadow = cast
      node.receiveShadow = receive
      const material = node.material as MeshStandardMaterial
      material.envMapIntensity = envMapIntensity
    })
    return reflected ? clone : excludeFromReflection(clone)
  }, [gltf, cast, receive, envMapIntensity, reflected])
}
