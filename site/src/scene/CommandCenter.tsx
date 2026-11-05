import { lazy, Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { ACESFilmicToneMapping, PCFShadowMap } from 'three'
import { TIER_SETTINGS, type QualityTier } from '../lib/quality'
import AgentPanels from './AgentPanels'
import CameraRig from './CameraRig'
import Console from './Console'
import DetailGroups from './DetailGroups'
import Environment from './Environment'
import Haze from './Haze'
import { HERO_CAMERA } from './layout'
import Lights from './Lights'
import Racks from './Racks'
import Room, { WallProps } from './Room'
import { useChapter } from './useChapter'

// Bloom (high tier) is its own chunk: phones and tablets never download it.
const Bloom = lazy(() => import('./Bloom'))

export interface CommandCenterProps {
  motion: boolean
  tier: QualityTier
  /** true while the scene is dimmed past the contact section, or the tab is hidden: nothing renders */
  paused: boolean
  onReady: () => void
  onLost: () => void
  onDecline: () => void
}

/** Signals the first finished frames (the poster stays up until the textures and fonts are in and 4 frames are drawn). */
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

/** Everything inside the canvas: the chapter ref from native scroll feeds the camera, the panels and the detail groups. */
function Contents({ tier, motion, onReady }: { tier: QualityTier; motion: boolean; onReady: () => void }) {
  const chapter = useChapter()
  return (
    <>
      <CameraRig chapter={chapter} motion={motion} />
      <Suspense fallback={null}>
        <Environment intensity={0.3} />
        <Lights tier={tier} />
        <Room tier={tier} />
        <WallProps tier={tier} />
        <Racks tier={tier} motion={motion} />
        <Console tier={tier} />
        <AgentPanels tier={tier} motion={motion} chapter={chapter} />
        <Haze />
        <ReadyGate motion={motion} onReady={onReady} />
      </Suspense>
      <DetailGroups tier={tier} chapter={chapter} motion={motion} />
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
      camera={{ position: HERO_CAMERA.position, fov: HERO_CAMERA.fov, near: 0.1, far: 60 }}
      gl={{
        antialias: settings.msaa && !settings.bloom,
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
      <color attach="background" args={['#05080c']} />
      <fogExp2 attach="fog" args={['#09141d', 0.038]} />
      <Contents tier={tier} motion={motion} onReady={onReady} />
      {settings.bloom && (
        <Suspense fallback={null}>
          <Bloom />
        </Suspense>
      )}
    </Canvas>
  )
}
