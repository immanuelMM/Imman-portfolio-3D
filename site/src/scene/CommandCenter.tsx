import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { ACESFilmicToneMapping, PCFShadowMap } from 'three'
import { TIER_SETTINGS, type QualityTier } from '../lib/quality'

export interface CommandCenterProps {
  motion: boolean
  tier: QualityTier
  /** true while the scene is dimmed past the contact section, or the tab is hidden: nothing renders */
  paused: boolean
  onReady: () => void
  onLost: () => void
  onDecline: () => void
}

/** Signals the first finished frames (the poster stays up until then). */
function ReadyGate({ motion, onReady }: { motion: boolean; onReady: () => void }) {
  const frames = useRef(0)
  const invalidate = useThree((s) => s.invalidate)
  useFrame(() => {
    frames.current += 1
    if (frames.current < 4) invalidate()
    if (frames.current === 4) onReady()
  })
  useEffect(() => {
    invalidate()
  }, [invalidate, motion])
  return null
}

/**
 * TEMPORARY placeholder (M0): a dark room box and one cool light, so the gate, tiers and states can be tested.
 * The photoreal command-center room replaces this file's content in S1.
 */
function PlaceholderRoom() {
  return (
    <>
      <color attach="background" args={['#07090d']} />
      <ambientLight intensity={0.15} color="#5ee7ff" />
      <pointLight position={[0, 2.2, 1]} intensity={14} color="#5ee7ff" distance={14} />
      <mesh position={[0, 1.6, -1]}>
        <boxGeometry args={[9, 3.4, 9]} />
        <meshStandardMaterial color="#11161d" roughness={0.9} side={1} />
      </mesh>
    </>
  )
}

export default function CommandCenter({ motion, tier, paused, onReady, onLost, onDecline }: CommandCenterProps) {
  const settings = TIER_SETTINGS[tier]
  return (
    <Canvas
      dpr={settings.dpr}
      frameloop={motion ? (paused ? 'never' : 'always') : 'demand'}
      shadows={settings.shadows ? { type: PCFShadowMap } : false}
      camera={{ position: [0, 1.5, 4.2], fov: 40, near: 0.1, far: 60 }}
      gl={{
        antialias: settings.msaa,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      style={{ pointerEvents: 'none', touchAction: 'pan-y' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onLost()
        })
      }}
    >
      {motion && tier === 'high' && <PerformanceMonitor onDecline={onDecline} />}
      <PlaceholderRoom />
      <ReadyGate motion={motion} onReady={onReady} />
    </Canvas>
  )
}
