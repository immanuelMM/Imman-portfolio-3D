// Responsive layout per viewport: no horizontal scroll, left/right card alternation >= 1024, tap targets, controls
// inside the viewport, minimum font size.
import { expect, test } from '@playwright/test'
import { CHAPTERS, instantScroll, meta, openSession, waitSceneState, type Session } from './support'

test.describe.configure({ mode: 'serial' })

let s: Session
test.beforeAll(async ({ browser }, info) => {
  s = await openSession(browser, info)
  await waitSceneState(s.page)
})
test.afterAll(async () => {
  await s?.ctx.close()
})

test('no horizontal scroll at the top, in every chapter and at the end', async () => {
  const { page } = s
  const points: number[] = [0]
  for (const id of CHAPTERS) points.push(await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top + scrollY))
  points.push(await page.evaluate(() => document.documentElement.scrollHeight))
  for (const y of points) {
    await instantScroll(page, y)
    const m = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      inner: window.innerWidth,
    }))
    expect(m.doc, `documentElement scrollWidth at y=${y}`).toBeLessThanOrEqual(m.inner)
    expect(m.body, `body scrollWidth at y=${y}`).toBeLessThanOrEqual(m.inner)
  }
  // nothing is positioned outside the viewport horizontally (the sticky bars and the cards)
  const wide = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('.chapter__inner, .site-header, .cv-bar, .agents, .cards'))
      .filter((e) => e.getClientRects().length)
      .map((e) => ({ cls: e.className, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.left < -1 || r.right > window.innerWidth + 1)
      .map(({ cls, r }) => `${cls}: ${Math.round(r.left)}..${Math.round(r.right)}`),
  )
  expect(wide).toEqual([])
})

test('cards alternate left and right at >= 1024 wide landscape; stack below', async ({}, info) => {
  const { page } = s
  const { width } = meta(info)
  const data = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('section[data-chapter]')).map((sec) => {
      const r = sec.querySelector<HTMLElement>('.chapter__inner')!.getBoundingClientRect()
      return {
        id: sec.dataset.chapter!,
        side: sec.dataset.side!,
        centre: (r.left + r.right) / 2,
        left: r.left,
        right: r.right,
        vw: window.innerWidth,
        vh: window.innerHeight,
      }
    }),
  )
  expect(data.map((d) => d.id)).toEqual([...CHAPTERS])
  const landscapeDesktop = width >= 1024 && data[0].vw > data[0].vh
  if (landscapeDesktop) {
    data.forEach((d, i) => {
      const expected = i % 2 === 0 ? 'left' : 'right'
      expect(d.side, `${d.id} data-side`).toBe(expected)
      if (expected === 'left') {
        expect(d.centre, `${d.id} card centre sits in the left half`).toBeLessThan(d.vw / 2)
        expect(d.right, `${d.id} leaves the right half open`).toBeLessThanOrEqual(d.vw * 0.62)
      } else {
        expect(d.centre, `${d.id} card centre sits in the right half`).toBeGreaterThan(d.vw / 2)
        expect(d.left, `${d.id} leaves the left half open`).toBeGreaterThanOrEqual(d.vw * 0.38)
      }
    })
  } else {
    for (const d of data) {
      // stacked: the card is (nearly) full width and centred, not pushed to one side
      expect(Math.abs(d.centre - d.vw / 2), `${d.id} centred when stacked`).toBeLessThan(d.vw * 0.08)
    }
  }
})

test('controls are big enough and fully inside the viewport', async ({}, info) => {
  const { page } = s
  const touch = meta(info).touch
  const min = touch ? 44 : 24 // 44 = iOS/Material tap size on touch, 24 = WCAG 2.2 target size minimum
  await instantScroll(page, 0)
  const selectors = ['.brand', '[data-nav-toggle]', '.hero__cta .btn', '.agent', '[data-expand-toggle]', '.cv-bar .btn']
  const small: string[] = []
  for (const sel of selectors) {
    const loc = page.locator(`${sel}:visible`)
    const n = await loc.count()
    for (let i = 0; i < n; i++) {
      const b = await loc.nth(i).boundingBox()
      if (!b) continue
      const label = `${sel}#${i} ${Math.round(b.width)}x${Math.round(b.height)}`
      if (b.height < min || b.width < min) small.push(label)
    }
  }
  expect(small, `controls smaller than ${min}px`).toEqual([])

  // fixed controls fully inside the viewport (poll: the header slides/animates in)
  for (const sel of ['.site-header', '.cv-bar', '[data-nav-toggle]']) {
    const loc = page.locator(`${sel}:visible`).first()
    if ((await loc.count()) === 0) continue
    await expect
      .poll(async () => {
        const b = await loc.boundingBox()
        const vp = page.viewportSize()!
        return !!b && b.x >= -1 && b.y >= -1 && b.x + b.width <= vp.width + 1 && b.y + b.height <= vp.height + 1
      })
      .toBe(true)
  }
})

test('visible text is at least 11px', async () => {
  const tiny = await s.page.evaluate(() => {
    const out = new Map<string, number>()
    const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!
      if (!n.textContent!.trim() || el.closest('[hidden], #cv-print, script, style, .sr-only')) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const px = parseFloat(cs.fontSize)
      if (px < 11) out.set(`${el.tagName.toLowerCase()}.${el.className} "${n.textContent!.trim().slice(0, 24)}"`, px)
    }
    return Array.from(out.entries()).map(([k, v]) => `${k} ${v}px`)
  })
  expect(tiny).toEqual([])
})

test('no console errors', async () => {
  expect(s.errors).toEqual([])
})
