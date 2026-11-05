// The build served under /immanuel-3d/ only (like GitHub Pages; the server answers 404 for anything outside it):
// the page, the scene chunk and its assets, the agent dialog, and the lazy Word export load with zero 404s, and
// every same-origin URL requested carries the base path.
import { expect, test } from '@playwright/test'
import { BASE, instantScroll, CHAPTERS, openSession, waitSceneState, type Session } from './support'

test.describe.configure({ mode: 'serial' })

let s: Session
test.beforeAll(async ({ browser }, info) => {
  s = await openSession(browser, info)
})
test.afterAll(async () => {
  await s?.ctx.close()
})

test('scene loads under the base path and scrolls through every chapter', async () => {
  const state = await waitSceneState(s.page)
  expect(state).toBe('ready')
  for (const id of CHAPTERS) {
    const top = await s.page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top + scrollY)
    await instantScroll(s.page, top)
  }
})

test('agent dialog and Word export (lazy chunk) load', async () => {
  const { page } = s
  const btn = page.locator('.agent[data-agent="lead"]')
  await btn.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await btn.click()
  await expect(page.locator('#agent-dialog')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.locator('#contact-title').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  const download = page.waitForEvent('download', { timeout: 60_000 })
  await page.locator('#contact [data-cv="word"]').click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.docx$/)
})

test('every DOM URL and every request is under the base path; nothing 404s', async () => {
  const { page } = s
  const origin = new URL(page.url()).origin
  const doc = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[href], [src], [srcset], [poster]')).flatMap((e) => {
      const vals = ['href', 'src', 'poster'].map((a) => e.getAttribute(a)).filter(Boolean) as string[]
      const srcset = e.getAttribute('srcset')
      if (srcset) vals.push(...srcset.split(',').map((x) => x.trim().split(/\s+/)[0]))
      return vals
    }),
  )
  const sameOriginDom = doc.filter((u) => u.startsWith('/') && !u.startsWith('//'))
  expect(sameOriginDom.length).toBeGreaterThan(10)
  expect(sameOriginDom.filter((u) => !u.startsWith(BASE))).toEqual([])

  const sameOriginReqs = s.requests.filter((u) => u.startsWith(origin))
  expect(sameOriginReqs.length).toBeGreaterThan(20)
  expect(sameOriginReqs.filter((u) => !new URL(u).pathname.startsWith(BASE))).toEqual([])
  expect(s.failed, 'responses with status >= 400 or failed requests').toEqual([])
  expect(s.errors).toEqual([])
})

test('the server really is strict: the same asset without the base path is a 404', async () => {
  const { page } = s
  const res = await page.request.get('/favicon.svg')
  expect(res.status()).toBe(404)
  const ok = await page.request.get(`${BASE}favicon.svg`)
  expect(ok.status()).toBe(200)
})
