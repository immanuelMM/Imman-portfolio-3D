// Scene state, canvas, chapter visibility/clickability, console errors, context loss, reduced motion.
// One page per project is shared by the serial tests (the swiftshader scene takes 33-51 s to be ready).
import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import {
  CHAPTERS,
  hasGl,
  instantScroll,
  meta,
  openNavIfCollapsed,
  openSession,
  sceneAttr,
  SCENE_ONLY_CSS,
  waitCameraSettled,
  waitSceneState,
  type Session,
} from './support'

test.describe.configure({ mode: 'serial' })

let s: Session

test.beforeAll(async ({ browser }, info) => {
  s = await openSession(browser, info)
})
test.afterAll(async () => {
  await s?.ctx.close()
})

/** Screenshot of only the fixed 3D layer (page content, header and bars hidden, poster hidden). */
async function sceneShot() {
  return s.page.screenshot({
    style: SCENE_ONLY_CSS,
    animations: 'allow',
  })
}

test('scene reaches its terminal state for this mode', async ({}, info) => {
  const { mode, tier } = meta(info)
  const state = await waitSceneState(s.page)
  if (mode === 'no-webgl') {
    expect(state).toBe('poster')
    // the poster path never downloads the three.js chunk
    expect(s.requests.filter((u) => /SceneRoot|three|react-dom/i.test(u))).toEqual([])
  } else if (mode === 'reduced-motion') {
    expect(state).toBe('still')
  } else {
    expect(state).toBe('ready')
  }
  if (hasGl(info)) expect(await sceneAttr(s.page, 'data-tier')).toBe(tier)
})

test('canvas is not blank (or the poster is shown without WebGL)', async ({}, info) => {
  const { page } = s
  if (!hasGl(info)) {
    const poster = page.locator('.scene-poster')
    await expect(poster).toHaveCSS('opacity', '1')
    expect(await poster.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('poster-hero')
    expect(await page.locator('#scene-canvas canvas').count()).toBe(0)
    return
  }
  await waitCameraSettled(page)
  const canvas = page.locator('#scene-canvas canvas')
  await expect(canvas).toHaveCount(1)
  const box = await canvas.boundingBox()
  expect(box!.width).toBeGreaterThan(200)
  expect(box!.height).toBeGreaterThan(200)
  await expect(page.locator('#scene-canvas')).toHaveCSS('opacity', '1') // the canvas has faded in over the poster

  const buf = await sceneShot()
  const st = await sharp(buf).stats()
  const stdev = st.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3
  const mean = st.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3
  const max = Math.max(...st.channels.slice(0, 3).map((c) => c.max))
  info.annotations.push({ type: 'canvas', description: `mean ${mean.toFixed(1)} stdev ${stdev.toFixed(1)} max ${max}` })
  expect(stdev, 'a blank (single colour) canvas has no variance').toBeGreaterThan(4)
  expect(max, 'something lit is on screen').toBeGreaterThan(80)
  await info.attach('scene-only.png', { body: buf, contentType: 'image/png' })
})

test('every chapter heading and every CTA is visible and receives clicks over the scene', async () => {
  const { page } = s
  for (const id of CHAPTERS) {
    const heading = page.locator(`#${id}-title`)
    await heading.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await expect(heading, `${id} heading`).toBeVisible()
    await expect(heading).not.toBeEmpty()
    await heading.click({ trial: true }) // trial = the heading, not a card or the canvas, is the hit target

    const ctas = page.locator(`#${id} :is(a[href], button, summary):visible`)
    const n = await ctas.count()
    expect(n, `${id} has interactive content`).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) {
      const el = ctas.nth(i)
      await el.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
      const label = (await el.innerText()).trim().slice(0, 40) || (await el.getAttribute('aria-label')) || `#${i}`
      await expect(el, `${id}: "${label}"`).toBeVisible()
      await el.click({ trial: true })
    }
  }
})

test('header controls are reachable: brand, nav links, CV menu', async ({}, info) => {
  const { page } = s
  await instantScroll(page, 0)
  await expect(page.locator('.brand')).toBeVisible()
  await openNavIfCollapsed(page)
  const links = page.locator('#primary-nav a')
  expect(await links.count()).toBe(CHAPTERS.length)
  for (let i = 0; i < CHAPTERS.length; i++) {
    await expect(links.nth(i)).toBeVisible()
    await links.nth(i).click({ trial: true })
  }
  if (meta(info).touch && meta(info).width < 640) {
    await page.locator('[data-nav-toggle]').click() // close again
  }
})

test('context loss shows the poster (webgl only)', async ({}, info) => {
  test.skip(meta(info).mode !== 'webgl', 'needs a live scene that is not in reduced motion')
  const { page } = s
  await instantScroll(page, 0)
  await page.evaluate(() => {
    const canvas = document.querySelector('#scene-canvas canvas') as HTMLCanvasElement
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGL2RenderingContext
    gl.getExtension('WEBGL_lose_context')!.loseContext()
  })
  await page.waitForFunction(() => document.getElementById('scene')?.dataset.sceneState === 'lost', null, {
    timeout: 60_000,
  })
  const poster = page.locator('.scene-poster')
  await expect(page.locator('#scene-canvas')).toHaveCSS('opacity', '0', { timeout: 15_000 }) // canvas gone, poster is what shows
  await expect(poster).toBeVisible()
  expect(await poster.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('poster-hero')
  // the page still works without the scene
  await expect(page.locator('#about-title')).toBeVisible()
  await page.locator('#contact-title').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await expect(page.locator('#contact-title')).toBeVisible()
})

test('reduced motion: state still, camera does not move on scroll (reduced-motion only)', async ({}, info) => {
  test.skip(meta(info).mode !== 'reduced-motion', 'reduced-motion project only')
  const { page } = s
  await instantScroll(page, 0)
  await waitCameraSettled(page)
  const before = await sceneShot()
  // watch data-camera for any `moving` while we scroll through the whole page
  await page.evaluate(() => {
    const el = document.getElementById('scene')!
    ;(window as unknown as { __cam: string[] }).__cam = []
    new MutationObserver(() => (window as unknown as { __cam: string[] }).__cam.push(el.dataset.camera ?? '')).observe(el, {
      attributes: true,
      attributeFilter: ['data-camera'],
    })
  })
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (const f of [0.2, 0.45, 0.7, 0.95]) await instantScroll(page, height * f)
  await instantScroll(page, 0)
  await page.waitForTimeout(500)
  const cam = await page.evaluate(() => (window as unknown as { __cam: string[] }).__cam)
  expect(cam, 'camera never starts moving').not.toContain('moving')
  expect(await sceneAttr(page, 'data-scene-state')).toBe('still')
  const after = await sceneShot()
  const a = await sharp(before).raw().toBuffer()
  const b = await sharp(after).raw().toBuffer()
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  const meanDiff = sum / a.length
  info.annotations.push({ type: 'camera-diff', description: `${meanDiff.toFixed(3)} / 255` })
  expect(meanDiff, 'scene pixels identical before and after scrolling').toBeLessThan(0.5)
})

test('no console errors or failed requests during the whole run', async ({}, info) => {
  expect(s.errors).toEqual([])
  expect(s.failed).toEqual([])
  if (s.aborted.length) info.annotations.push({ type: 'aborted', description: s.aborted.join(', ') })
})
