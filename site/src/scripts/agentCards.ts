/**
 * Eager and small. Wires the agent detail card (components/AgentDialog.astro) to the shared store in lib/agentCards.ts:
 * - any `[data-agent]` button opens that agent's card (the 3D panels call the same `open`),
 * - the card is a modal dialog: the rest of the page is `inert` while it is open, Tab stays inside, Escape, the close button
 *   and a click on the backdrop close it, and focus returns to the control that opened it,
 * - `[data-agent-go]` buttons step to the previous / next agent.
 */
import { agentCards } from '../lib/agentCards'

const root = document.querySelector<HTMLElement>('[data-agent-dialog]')
const sheet = root?.querySelector<HTMLElement>('[role="dialog"]')

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

if (root && sheet) {
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-agent-card]'))
  const inerted: HTMLElement[] = []
  let openedAt = 0

  const setInert = (on: boolean) => {
    if (on) {
      for (const el of Array.from(document.body.children)) {
        if (!(el instanceof HTMLElement) || el === root || el.id === 'scene' || el.tagName === 'SCRIPT') continue
        if (!el.inert) {
          el.inert = true
          inerted.push(el)
        }
      }
    } else {
      inerted.splice(0).forEach((el) => (el.inert = false))
    }
  }

  const render = (agentId: string | null) => {
    const open = agentId !== null
    const wasOpen = !root.hidden
    for (const s of sections) s.hidden = s.dataset.agentCard !== agentId
    if (open) {
      sheet.setAttribute('aria-labelledby', `agent-title-${agentId}`)
      if (!wasOpen) openedAt = performance.now()
      root.hidden = false
      document.documentElement.dataset.agentOpen = 'true'
      setInert(true)
      sheet.scrollTop = 0
      sheet.querySelector<HTMLElement>('.agent-dialog__body')?.scrollTo(0, 0)
      sheet.focus({ preventScroll: true })
    } else if (wasOpen) {
      root.hidden = true
      delete document.documentElement.dataset.agentOpen
      setInert(false)
      const back = agentCards.trigger()
      if (back && back.isConnected) back.focus({ preventScroll: true })
      else sheet.blur()
    }
  }

  agentCards.subscribe((state) => render(state.agentId))

  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null
    const opener = target?.closest<HTMLElement>('[data-agent]')
    if (opener?.dataset.agent) {
      agentCards.open(opener.dataset.agent, opener)
      return
    }
    const closer = target?.closest<HTMLElement>('[data-agent-close]')
    if (closer && root.contains(closer)) {
      // A touch tap on a panel is followed by a synthesized click at the same spot: it must not hit the new backdrop.
      if (closer.classList.contains('agent-dialog__backdrop') && performance.now() - openedAt < 450) return
      agentCards.close()
      return
    }
    const go = target?.closest<HTMLElement>('[data-agent-go]')
    if (go?.dataset.agentGo) agentCards.open(go.dataset.agentGo)
  })

  document.addEventListener('keydown', (e) => {
    if (root.hidden) return
    if (e.key === 'Escape') {
      e.preventDefault()
      agentCards.close()
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === sheet)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  })
}
