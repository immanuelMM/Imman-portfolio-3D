import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test'

export const BASE = '/immanuel-3d/'
export type Mode = 'webgl' | 'no-webgl' | 'reduced-motion' | 'base-path'
export type Meta = { mode: Mode; tier: 'high' | 'touch' | 'low'; touch: boolean; width: number }

export const CHAPTERS = ['about', 'experience', 'ai', 'web', 'education', 'contact'] as const

export const meta = (info: TestInfo) => info.project.metadata as Meta
/** Modes that run the real scene (swiftshader). */
export const hasGl = (info: TestInfo) => meta(info).mode !== 'no-webgl'

/** Console errors that are known noise: R3F 9.8 + three 0.187 log a Clock deprecation. */
const NOISE = /THREE\.Clock/

export type Session = {
  ctx: BrowserContext
  page: Page
  errors: string[]
  failed: string[]
  requests: string[]
}

/**
 * One browser context per spec file (a serial describe shares it): the swiftshader scene needs 33-51 s to be ready, so
 * every test of a file reuses one loaded page. Options come from the project (`use`) because `browser.newContext` does not inherit them.
 */
export async function openSession(browser: Browser, info: TestInfo, query = ''): Promise<Session> {
  const use = info.project.use
  const ctx = await browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    hasTouch: use.hasTouch,
    isMobile: use.isMobile,
    reducedMotion: use.reducedMotion,
    acceptDownloads: true,
  })
  const page = await ctx.newPage()
  const s: Session = { ctx, page, errors: [], failed: [], requests: [] }
  page.on('console', (m) => {
    if (m.type() === 'error' && !NOISE.test(m.text())) s.errors.push(m.text())
  })
  page.on('pageerror', (e) => s.errors.push(`pageerror: ${e.message}`))
  page.on('request', (r) => s.requests.push(r.url()))
  page.on('requestfailed', (r) => s.failed.push(`${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => {
    if (r.status() >= 400) s.failed.push(`${r.status()} ${r.url()}`)
  })
  const m = meta(info)
  const tier = m.mode === 'no-webgl' ? '' : `tier=${m.tier}`
  const q = [tier, query].filter(Boolean).join('&')
  await page.goto(`${BASE}${q ? `?${q}` : ''}`)
  return s
}

/** Nudge the defer gate (first input) and wait for the terminal scene state. */
export async function waitSceneState(page: Page, states = ['ready', 'still', 'poster', 'lost']) {
  await page.mouse.move(10, 10)
  await page.mouse.wheel(0, 1)
  await page.waitForFunction(
    (list) => list.includes(document.getElementById('scene')?.dataset.sceneState ?? ''),
    states,
    { timeout: 170_000 },
  )
  return page.evaluate(() => document.getElementById('scene')!.dataset.sceneState!)
}

export const sceneAttr = (page: Page, name: string) =>
  page.evaluate((n) => document.getElementById('scene')!.getAttribute(n), name)

/** Wait for the camera to stop easing (S2: data-camera = moving | settled). */
export async function waitCameraSettled(page: Page) {
  await page.waitForFunction(() => document.getElementById('scene')?.dataset.camera !== 'moving', null, {
    timeout: 120_000,
  })
}

export async function instantScroll(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
}

/** On phones the nav links live in a dropdown behind the menu button. */
export async function openNavIfCollapsed(page: Page) {
  const toggle = page.locator('[data-nav-toggle]')
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
    await page.locator('#primary-nav a').first().waitFor({ state: 'visible' })
  }
}

export async function closeNavIfOpen(page: Page) {
  const toggle = page.locator('[data-nav-toggle]')
  if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click()
}

/** Hide page content so only the 3D layer is in a screenshot (the scene is fixed behind everything). */
export const SCENE_ONLY_CSS =
  'main, header.site-header, footer, .cv-bar, #cv-toast, .skip-link, dialog, [role="dialog"] { visibility: hidden !important }'
