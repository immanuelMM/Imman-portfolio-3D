import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { pickBrowserTier, type QualityTier } from '../lib/quality'
import CommandCenter from '../scene/CommandCenter'

export type SceneState = 'ready' | 'still' | 'lost'

interface SceneAppProps {
  onState: (state: SceneState) => void
}

/**
 * Rendering stops while the scene is dimmed past the contact section (#scene[data-faded], set by scripts/activeSection.ts)
 * and while the tab is hidden. It resumes when either ends.
 */
function useScenePaused(): boolean {
  const [faded, setFaded] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)

  useEffect(() => {
    const scene = document.getElementById('scene')
    if (!scene) return
    let timer = 0
    const read = () => {
      window.clearTimeout(timer)
      const next = scene.dataset.faded === 'true'
      // Let the fade finish before the last frame is frozen.
      if (next) timer = window.setTimeout(() => setFaded(true), 600)
      else setFaded(false)
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(scene, { attributes: true, attributeFilter: ['data-faded'] })
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return faded || hidden
}

function SceneApp({ onState }: SceneAppProps) {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [tier, setTier] = useState<QualityTier>(pickBrowserTier)
  const [lost, setLost] = useState(false)
  const paused = useScenePaused()
  const isReady = useRef(false)
  const motion = !reduced

  // Reduced motion can be toggled mid-visit: stop drift and parallax without a reload.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (isReady.current) onState(motion ? 'ready' : 'still')
  }, [motion, onState])

  const handleReady = useCallback(() => {
    isReady.current = true
    onState(motion ? 'ready' : 'still')
  }, [motion, onState])

  const handleLost = useCallback(() => {
    setLost(true)
    onState('lost')
  }, [onState])

  const handleDecline = useCallback(() => setTier('low'), [])

  if (lost) return null
  return (
    <CommandCenter
      motion={motion}
      tier={tier}
      paused={paused}
      onReady={handleReady}
      onLost={handleLost}
      onDecline={handleDecline}
    />
  )
}

export function mountScene(container: HTMLElement, onState: (state: SceneState) => void): () => void {
  const root = createRoot(container)
  root.render(<SceneApp onState={onState} />)
  return () => root.unmount()
}
