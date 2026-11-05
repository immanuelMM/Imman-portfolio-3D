// The nav item marked aria-current must be the chapter the scene shows (#scene[data-chapter]).
import { expect, test } from '@playwright/test'
import {
  CHAPTERS,
  closeNavIfOpen,
  instantScroll,
  openNavIfCollapsed,
  openSession,
  sceneAttr,
  waitSceneState,
  type Session,
} from './support'

test.describe.configure({ mode: 'serial' })

let s: Session
test.beforeAll(async ({ browser }, info) => {
  s = await openSession(browser, info)
  await waitSceneState(s.page)
})
test.afterAll(async () => {
  await s?.ctx.close()
})

/** aria-current links are in the DOM even when the phone menu is collapsed. */
const currentLinks = () =>
  s.page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('#primary-nav a[aria-current]')).map((a) => a.hash.slice(1)),
  )

test('clicking a nav link lands on its chapter: aria-current, data-chapter and the URL hash agree', async () => {
  for (const id of CHAPTERS) {
    await openNavIfCollapsed(s.page)
    await s.page.locator(`#primary-nav a[href$="#${id}"]`).click()
    await expect.poll(() => sceneAttr(s.page, 'data-chapter'), { timeout: 20_000 }).toBe(id)
    await expect.poll(currentLinks, { timeout: 20_000 }).toEqual([id])
    await expect(s.page).toHaveURL(new RegExp(`#${id}$`))
    await closeNavIfOpen(s.page)
  }
})

test('scroll sweep: the active nav item equals data-chapter at every sampled position', async ({}, info) => {
  const { page } = s
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  const mismatches: string[] = []
  let samples = 0
  for (let y = 0; y <= total; y += 160) {
    await instantScroll(page, y)
    const [chapter, current] = [await sceneAttr(page, 'data-chapter'), await currentLinks()]
    samples++
    if (current.length !== 1 || current[0] !== chapter) mismatches.push(`y=${y}: data-chapter=${chapter} nav=${current}`)
  }
  info.annotations.push({ type: 'sweep', description: `${samples} samples, ${mismatches.length} mismatches` })
  expect(mismatches).toEqual([])
})

test('jumping straight to a section (End/Home, instant anchor, scrollbar drag) updates data-chapter', async () => {
  test.fail(
    true,
    'BUG Q1-3: readAnchors() (lib/chapterAnchors.ts) uses querySelectorAll("[data-chapter]"), which also matches #scene itself (it carries data-chapter, written by activeSection.ts). That fake anchor sits at scrollY - H/2 and is "current chapter", so any jump of more than H/2 px leaves data-chapter (and the scene camera) on the old chapter. Use "section[data-chapter]". Remove this line once fixed.',
  )
  const { page } = s
  for (const id of CHAPTERS) {
    const top = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    await instantScroll(page, top)
    expect(await sceneAttr(page, 'data-chapter'), `at the top of #${id}`).toBe(id)
    expect(await currentLinks()).toEqual([id])
  }
  await instantScroll(page, await page.evaluate(() => document.documentElement.scrollHeight))
  expect(await currentLinks()).toEqual(['contact'])
  expect(await sceneAttr(page, 'data-chapter')).toBe('contact')
})

test('no console errors', async () => {
  expect(s.errors).toEqual([])
})
