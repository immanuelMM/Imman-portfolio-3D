/**
 * Eager and tiny. The chapter cards are glass that leans up to 4 degrees toward the cursor and carries a cursor-following
 * highlight. Mouse-like pointers only (hover + fine), never with reduced motion, and nothing happens on touch.
 * One shared pointer listener, throttled to one write per animation frame; the card's rect is read once when the pointer
 * enters it (and again after a scroll or resize), so there is no layout read per move. Only CSS variables are written:
 * `--rx --ry` (degrees) and `--mx --my` (percent), plus `data-hot` while the pointer is over the card.
 */
import { glassEnabled, glassPointer } from '../lib/tilt'

const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

let frame = 0
let card: HTMLElement | null = null
let active: HTMLElement | null = null
let rect: DOMRect | null = null
let x = 0
let y = 0

function release(el: HTMLElement | null) {
  if (!el) return
  el.removeAttribute('data-hot')
  el.style.removeProperty('--rx')
  el.style.removeProperty('--ry')
}

function update() {
  frame = 0
  if (!glassEnabled(fine.matches, reduced.matches) || !card) {
    release(active)
    active = null
    return
  }
  if (card !== active) {
    release(active)
    active = card
    rect = null
  }
  rect ??= card.getBoundingClientRect() // read once per entry, before any write of this frame
  const p = glassPointer(rect, x, y)
  card.dataset.hot = ''
  card.style.setProperty('--rx', `${p.rx.toFixed(2)}deg`)
  card.style.setProperty('--ry', `${p.ry.toFixed(2)}deg`)
  card.style.setProperty('--mx', `${p.mx.toFixed(1)}%`)
  card.style.setProperty('--my', `${p.my.toFixed(1)}%`)
}

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(update)
}

window.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType !== 'mouse') return
    x = e.clientX
    y = e.clientY
    card = (e.target instanceof Element ? e.target : null)?.closest<HTMLElement>('.chapter__inner') ?? null
    schedule()
  },
  { passive: true },
)
window.addEventListener(
  'scroll',
  () => {
    rect = null
  },
  { passive: true },
)
window.addEventListener('resize', () => (rect = null), { passive: true })
document.documentElement.addEventListener('pointerleave', () => {
  card = null
  schedule()
})
