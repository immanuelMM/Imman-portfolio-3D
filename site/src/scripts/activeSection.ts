/**
 * Eager and tiny. On scroll (passive listener plus one rAF per frame) it
 * - marks the nav link of the section in view (aria-current),
 * - sets `#scene[data-chapter]` (the scene's current chapter, for tests and styling),
 * - dims the scene (#scene[data-faded]) once the footer is half way up the screen.
 */
import { readAnchors } from '../lib/chapterAnchors'
import { isFaded, pickActive } from '../lib/activeSection'
import { chapterProgress } from '../scene/chapterProgress'
import { CHAPTER_IDS } from '../scene/chapters'

const scene = document.getElementById('scene')
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav] a[href*="#"]'))
const sections = CHAPTER_IDS.flatMap((id) => {
  const el = document.getElementById(id)
  return el ? [{ id, el }] : []
})
const footer = document.querySelector<HTMLElement>('[data-chapter-end]')
const body = document.body

let frame = 0
function update() {
  frame = 0
  const y = window.scrollY
  const h = window.innerHeight

  const tops = sections.map(({ id, el }) => ({ id, top: el.getBoundingClientRect().top + y }))
  const atBottom = y + h >= document.documentElement.scrollHeight - 2
  const active = pickActive(y, h, tops, atBottom)
  for (const a of links) {
    if (a.hash.slice(1) === active) a.setAttribute('aria-current', 'true')
    else a.removeAttribute('aria-current')
  }
  // The sticky phone CV bar hides while the contact chapter is in view (it has its own CV buttons).
  body.dataset.inContact = String(active === 'contact')

  const { chapter } = chapterProgress(y, h, readAnchors())
  if (scene) {
    if (scene.dataset.chapter !== chapter) scene.dataset.chapter = chapter
    const end = footer ? footer.getBoundingClientRect().top + y : null
    scene.dataset.faded = String(isFaded(y, h, end))
  }
}

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(update)
}
window.addEventListener('scroll', schedule, { passive: true })
window.addEventListener('resize', schedule, { passive: true })
update()
