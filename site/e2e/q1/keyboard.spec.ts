// Keyboard-only: Tab through the whole page. Every visible interactive element is reachable, no trap, each focus has a
// visible indicator and is not hidden behind the sticky header/bar; then Enter/Space operate the controls.
import { expect, test } from '@playwright/test'
import { instantScroll, openSession, waitSceneState, type Session } from './support'

test.describe.configure({ mode: 'serial' })

let s: Session
test.beforeAll(async ({ browser }, info) => {
  s = await openSession(browser, info)
  await waitSceneState(s.page)
})
test.afterAll(async () => {
  await s?.ctx.close()
})

type Stop = { idx: number | null; desc: string; indicator: boolean; clear: boolean; blocker?: string }

test('Tab reaches every visible control, has a visible focus ring, never gets trapped or covered', async ({}, info) => {
  const { page } = s
  await instantScroll(page, 0)
  // Mark the controls a keyboard user should be able to reach (visible, not in a closed <details> or hidden/inert tree).
  const expected = await page.evaluate(() => {
    const sel = 'a[href], button:not([disabled]), summary, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const all = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter((el) => {
      // .cv-bar (phone sticky CV bar) is last in the DOM and hidden once the contact chapter is in view, where the same two
      // buttons exist in #contact: not reachable by Tab by design (noted in the Q1 report).
      if (el.closest('[hidden], [inert], #cv-print, dialog:not([open]), #agent-dialog, .cv-bar')) return false
      const closedDetails = el.closest('details:not([open])')
      if (closedDetails && !(el.tagName === 'SUMMARY' && el.parentElement === closedDetails)) return false
      const cs = getComputedStyle(el)
      return cs.visibility !== 'hidden' && cs.display !== 'none' && el.getClientRects().length > 0
    })
    all.forEach((el, i) => el.setAttribute('data-kb-idx', String(i)))
    return all.map((el) => (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40) || el.getAttribute('aria-label') || el.tagName)
  })
  expect(expected.length, "sanity: the page has many controls").toBeGreaterThan(30)

  const stops: Stop[] = []
  const seen = new Set<number>()
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  for (let i = 0; i < expected.length * 2 + 10; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(async (): Promise<Stop | 'body'> => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body || el === document.documentElement) return 'body'
      const cs = getComputedStyle(el)
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none'
      // some controls draw the ring on a wrapper (e.g. a card with :focus-within)
      const wrapCs = el.parentElement ? getComputedStyle(el.parentElement) : cs
      const wrapRing = wrapCs.outlineStyle !== 'none' || wrapCs.boxShadow !== 'none'
      // Smooth scrolling / glass tilt need a moment: poll up to ~1.5 s for the control to be the hit target at its centre.
      let clear = false
      let blocker = ''
      for (let k = 0; k < 90 && !clear; k++) {
        const r = el.getBoundingClientRect()
        const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1)
        const cy = Math.min(Math.max(r.top + Math.min(r.height / 2, 20), 1), innerHeight - 1)
        const top = document.elementFromPoint(cx, cy)
        clear = !!top && (top === el || el.contains(top) || top.contains(el))
        if (!clear) {
          blocker = `${top?.tagName.toLowerCase()}.${String(top?.className).split(' ')[0]} over rect y=${Math.round(r.top)}..${Math.round(r.bottom)} of ${innerHeight}`
          await new Promise((res) => requestAnimationFrame(() => res(null)))
        }
      }
      const idx = el.getAttribute('data-kb-idx')
      return {
        idx: idx === null ? null : Number(idx),
        desc: `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} "${(el.textContent ?? '').trim().slice(0, 28)}"`,
        indicator: ring || wrapRing,
        clear,
        blocker,
      }
    })
    if (stop === 'body') break // focus left the document: the end of the tab order, no trap
    stops.push(stop)
    if (stop.idx !== null) seen.add(stop.idx)
    if (seen.size === expected.length) break
  }

  const missing = expected.filter((_, i) => !seen.has(i))
  // Known bug Q1-1 (pinned below): contact rows lose the ring to a more specific `box-shadow: none` in glass.css.
  const noRing = stops.filter((x) => !x.indicator && !x.desc.startsWith('a.contact__row')).map((x) => x.desc)
  const covered = stops.filter((x) => !x.clear).map((x) => `${x.desc} <- ${x.blocker}`)
  info.annotations.push({ type: 'tab-stops', description: `${stops.length} stops, ${expected.length} expected` })
  expect(missing, 'controls never reached by Tab').toEqual([])
  expect(noRing, 'focus without a visible indicator').toEqual([])
  expect(covered, 'focused control covered by another element (sticky header/bar)').toEqual([])
})

test('contact links show a focus ring', async () => {
  test.fail(
    true,
    'BUG Q1-1: glass.css `.chapter[data-chapter=contact] .contact__row { box-shadow: none }` (0,3,0) beats base.css `:focus-visible { box-shadow: var(--focus-ring) }` (0,1,0), so the four contact links show no focus indicator (WCAG 2.4.7). Remove this line once fixed.',
  )
  const row = s.page.locator('a.contact__row').first()
  await row.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await s.page.keyboard.press('Shift') // last input is the keyboard => focus() matches :focus-visible
  await row.focus()
  await expect(row).toBeFocused()
  expect(await row.evaluate((el) => el.matches(':focus-visible')), 'precondition: :focus-visible applies').toBe(true)
  const shadow = await row.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow).not.toBe('none')
})

test('skip link jumps to the main content', async () => {
  const { page } = s
  await instantScroll(page, 3000)
  await page.evaluate(() => {
    // Chrome keeps the sequential-focus starting point after blur(): focus <body> to restart the tab order at the top.
    document.body.tabIndex = -1
    document.body.focus()
    document.body.removeAttribute('tabindex')
    window.scrollTo({ top: 0, behavior: 'instant' })
  })
  await page.keyboard.press('Tab')
  const first = page.locator('.skip-link')
  await expect(first).toBeFocused()
  await expect(first).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
})

test('Enter on a nav link moves to the chapter; Space and Enter toggle an experience entry', async () => {
  const { page } = s
  await instantScroll(page, 0)
  const toggle = page.locator('[data-nav-toggle]')
  if (await toggle.isVisible()) {
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#primary-nav a').first()).toBeVisible()
    await page.keyboard.press('Escape') // the menu closes on Escape, or we close it below
    if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.press('Enter')
  }
  const link = page.locator('#primary-nav a[href$="#web"]')
  if (!(await link.isVisible())) await toggle.press('Enter')
  await link.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => page.evaluate(() => document.getElementById('scene')!.dataset.chapter), { timeout: 20_000 }).toBe('web')

  const btn = page.locator('[data-expand-toggle]').nth(1)
  await btn.focus()
  const before = await btn.getAttribute('aria-expanded')
  await page.keyboard.press('Space')
  await expect(btn).not.toHaveAttribute('aria-expanded', before!)
  await page.keyboard.press('Enter')
  await expect(btn).toHaveAttribute('aria-expanded', before!)
})

test('the agent dialog is operable by keyboard alone and focus returns', async () => {
  const { page } = s
  const btn = page.locator('.agent[data-agent="docs"]')
  await btn.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await btn.focus()
  await page.keyboard.press('Space')
  await expect(page.locator('#agent-dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#agent-dialog')).toBeHidden()
  await expect(btn).toBeFocused()
})

test('no console errors', async () => {
  expect(s.errors).toEqual([])
})
