/**
 * Eager and tiny. Points the 3D room at the item the visitor is on: an agent button or a project card in a chapter card
 * (`[data-hl="agent:qa"]`, `[data-hl="screen:fullstack-agent"]`) lights its holo panel or project screen through the shared
 * store in lib/sceneHighlights.ts. Mouse hover, keyboard focus and a touch tap all count; hover-only behaviour never
 * gates anything (a tap highlights too, and the next tap elsewhere clears it).
 */
import { agents } from '../data/agents'
import { parseHighlight } from '../lib/sceneHighlight'
import { sceneHighlight } from '../lib/sceneHighlights'

const ids = agents.map((a) => a.id)
// `#scene[data-highlight]` = agent:qa | screen:master-brd, for tests and styling
sceneHighlight.subscribe((h) => {
  const scene = document.getElementById('scene')
  if (!scene) return
  if (h) scene.dataset.highlight = `${h.kind}:${h.id}`
  else delete scene.dataset.highlight
})
const itemOf = (target: EventTarget | null) =>
  (target instanceof Element ? target : null)?.closest<HTMLElement>('[data-hl]') ?? null
const pointTo = (el: HTMLElement | null) => sceneHighlight.set(parseHighlight(el?.dataset.hl, ids))

document.addEventListener(
  'pointerover',
  (e) => {
    if (e.pointerType === 'mouse') pointTo(itemOf(e.target))
  },
  { passive: true },
)
document.addEventListener(
  'pointerdown',
  (e) => {
    // touch and pen: the tap that presses an item highlights it, a press anywhere else clears it
    if (e.pointerType !== 'mouse') pointTo(itemOf(e.target))
  },
  { passive: true },
)
document.addEventListener('focusin', (e) => pointTo(itemOf(e.target)))
document.addEventListener('focusout', (e) => {
  if (!itemOf(e.relatedTarget)) pointTo(null)
})
document.documentElement.addEventListener('pointerleave', () => pointTo(null))
