import { useEffect, useRef } from 'react'
import type { SpotLight } from 'three'
import { TIER_SETTINGS, type QualityTier } from '../lib/quality'
import { ROOM } from './layout'

/**
 * Every light lives in the first-frame group (a light added later recompiles all materials). Six in all: a hemisphere
 * fill, one ceiling spot over the console and the arc (the only shadow caster), two cool rack washers, one cyan point behind the
 * panels and a small amber point on the console.
 */
export default function Lights({ tier }: { tier: QualityTier }) {
  const shadows = TIER_SETTINGS[tier].shadows
  const spot = useRef<SpotLight>(null)
  useEffect(() => {
    const light = spot.current
    if (!light) return
    light.target.position.set(0, 0, -1.8)
    light.target.updateMatrixWorld()
  }, [])
  return (
    <group>
      <hemisphereLight args={['#39424c', '#1b2128', 0.34]} />
      <spotLight
        ref={spot}
        position={[0, ROOM.height - 0.25, 2.2]}
        angle={0.78}
        penumbra={1}
        intensity={120}
        decay={2}
        distance={14}
        color="#e1e9f0"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <pointLight position={[-2.7, 2.7, 0.6]} intensity={18} distance={12} decay={2} color="#c3d2de" />
      <pointLight position={[0, 0.5, -3.9]} intensity={5} distance={9} decay={2} color="#6fe0f2" />
      <pointLight position={[2.7, 2.7, 0.6]} intensity={18} distance={12} decay={2} color="#c3d2de" />
      <pointLight position={[0, 1.1, 5.4]} intensity={3.2} distance={5} decay={2} color="#ffcf9e" />
    </group>
  )
}
