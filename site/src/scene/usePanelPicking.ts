import { useEffect, useRef, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import { agentCards } from '../lib/agentCards'
import type { AgentPanelSpec } from './layout'
import { isSceneTarget, isTap, pickPanel } from './pickPanel'

/**
 * Pointer picking on the holo panels. The canvas sits behind the page (`pointer-events: none`) so the page keeps scrolling
 * and its links work; presses on the bare page behind the content are listened for on `window` and ray-cast here.
 * - hover (fine pointers): the panel under the cursor is returned in the ref and the cursor becomes a pointer
 * - tap (press and release within ~8 px, so a scroll never counts): opens that agent's card, the same call the DOM buttons make
 */
export function usePanelPicking(panels: readonly AgentPanelSpec[]): RefObject<string | null> {
  const camera = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)
  const invalidate = useThree((s) => s.invalidate)
  const hovered = useRef<string | null>(null)

  useEffect(() => {
    const raycaster = new Raycaster()
    const ndc = new Vector2()
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const pick = (clientX: number, clientY: number, pad: number) => {
      const rect = dom.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1))
      raycaster.setFromCamera(ndc, camera)
      const { origin, direction } = raycaster.ray
      return pickPanel(
        { origin: [origin.x, origin.y, origin.z], direction: [direction.x, direction.y, direction.z] },
        panels,
        pad,
      )
    }
    const setHover = (id: string | null) => {
      if (id === hovered.current) return
      hovered.current = id
      document.body.toggleAttribute('data-panel-hover', id !== null)
      invalidate()
    }

    let down: { x: number; y: number; scene: boolean } | null = null
    const onDown = (e: PointerEvent) => {
      down =
        e.isPrimary && e.button === 0 ? { x: e.clientX, y: e.clientY, scene: isSceneTarget(e.target as Element) } : null
    }
    const onUp = (e: PointerEvent) => {
      const start = down
      down = null
      if (!start || !start.scene || document.hidden || agentCards.get().agentId !== null) return
      if (!isTap(start, { x: e.clientX, y: e.clientY }) || !isSceneTarget(e.target as Element)) return
      const id = pick(e.clientX, e.clientY, e.pointerType === 'touch' ? 0.12 : 0.03)
      if (!id) return
      const active = document.activeElement
      agentCards.open(id, active instanceof HTMLElement && active !== document.body ? active : null)
    }
    const onCancel = () => {
      down = null
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !finePointer.matches || agentCards.get().agentId !== null) return
      setHover(isSceneTarget(e.target as Element) ? pick(e.clientX, e.clientY, 0) : null)
    }
    const onLeave = () => setHover(null)

    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onCancel, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    const unsubscribe = agentCards.subscribe((state) => {
      if (state.agentId !== null) setHover(null)
    })
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      unsubscribe()
      document.body.removeAttribute('data-panel-hover')
    }
  }, [camera, dom, invalidate, panels])

  return hovered
}
