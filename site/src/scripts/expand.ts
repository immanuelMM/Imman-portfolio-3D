/**
 * Eager and tiny. Experience entries collapse to role, company and dates with the first one open; the role is a real
 * `<button aria-expanded aria-controls>` (click, Enter and Space all work). The page is rendered fully open, so without
 * JavaScript nothing is hidden, and the printed CV (`#cv-print`) is a separate document that always lists every bullet.
 */
import { initialExpanded, toggleAt } from '../lib/expand'

const items = Array.from(document.querySelectorAll<HTMLElement>('[data-expand-item]'))

function render(state: boolean[]) {
  items.forEach((item, i) => {
    const button = item.querySelector<HTMLElement>('[data-expand-toggle]')
    const panel = item.querySelector<HTMLElement>('[data-expand-panel]')
    if (!button || !panel) return
    button.setAttribute('aria-expanded', String(state[i]))
    panel.hidden = !state[i]
    item.dataset.open = String(state[i])
  })
}

if (items.length > 0) {
  let state = initialExpanded(items.length)
  render(state)
  document.addEventListener('click', (e) => {
    const button = (e.target instanceof Element ? e.target : null)?.closest<HTMLElement>('[data-expand-toggle]')
    if (!button) return
    const index = items.indexOf(button.closest<HTMLElement>('[data-expand-item]') as HTMLElement)
    if (index === -1) return
    state = toggleAt(state, index)
    render(state)
  })
}
