// Agent detail cards against a running preview (npm run build && npm run preview):
//   node e2e/agents.spec.mjs [--webgl] [--url=http://localhost:4361/immanuel-3d/] [--out=<dir for screenshots>]
// Without --webgl the scene is the poster: the DOM buttons must open the identical card (accessibility path).
// With --webgl (swiftshader, ~35 s to ready) a click on a 3D panel must open the card too, a scroll-like drag must not,
// and under reduced motion the camera must not move.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const url = arg('url', 'http://localhost:4361/immanuel-3d/')
const out = arg('out', '')
const webgl = process.argv.includes('--webgl')
const args = webgl
  ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
  : ['--disable-webgl', '--disable-3d-apis']

const browser = await chromium.launch({ channel: 'chrome', headless: true, args })
let step = 0
const ok = (msg) => console.log(`ok ${++step} - ${msg}`)
if (out) await mkdir(out, { recursive: true })

async function openPage(viewport, { touch = false, reducedMotion = false } = {}) {
  const ctx = await browser.newContext({
    viewport,
    hasTouch: touch,
    isMobile: touch,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  })
  const page = await ctx.newPage()
  const errors = []
  page.requests = []
  page.on('request', (r) => page.requests.push(r.url()))
  page.on('console', (m) => m.type() === 'error' && !/THREE\.Clock/.test(m.text()) && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url)
  return { ctx, page, errors }
}

const dialog = (page) => page.locator('[role="dialog"]')
const title = async (page) => (await page.locator('[data-agent-card]:not([hidden]) h3').innerText()).trim()
const activeIsInside = (page) => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))

async function waitScene(page) {
  await page.mouse.move(10, 10)
  await page.mouse.wheel(0, 1)
  await page.waitForFunction(
    () => ['ready', 'still', 'poster', 'lost'].includes(document.getElementById('scene')?.dataset.sceneState ?? ''),
    null,
    { timeout: 150000 },
  )
}

// ── Desktop: the DOM path ─────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await openPage({ width: 1440, height: 900 })
  if (webgl) await waitScene(page)

  const buttons = page.locator('.agents button.agent[data-agent]')
  assert.equal(await buttons.count(), 7)
  assert.equal(await dialog(page).count(), 1)
  assert.equal(await page.locator('#agent-dialog').isHidden(), true, 'card is closed on load')
  ok('seven agent buttons in the workflow strip, one hidden dialog')

  const qa = page.locator('.agent[data-agent="qa"]')
  await qa.scrollIntoViewIfNeeded()
  await qa.focus()
  await qa.press('Enter')
  await dialog(page).waitFor({ state: 'visible' })
  assert.equal(await title(page), 'QA')
  assert.equal(await dialog(page).getAttribute('aria-modal'), 'true')
  const labelledBy = await dialog(page).getAttribute('aria-labelledby')
  assert.equal((await page.locator(`#${labelledBy}`).innerText()).trim(), 'QA')
  const text = (await dialog(page).innerText()).toLowerCase() // labels are upper-cased by CSS
  for (const must of ['Step 4 of 6', 'Playwright and unit tests', 'Takes over from', 'Hands over to', 'Docs']) {
    assert.ok(text.includes(must.toLowerCase()), `card should contain "${must}"`)
  }
  assert.equal(await activeIsInside(page), true, 'focus moves into the dialog')
  assert.equal(await page.locator('main').evaluate((el) => el.inert), true, 'page behind is inert')
  ok('Enter on a strip button opens the QA card: role=dialog, aria-modal, labelled, content, focus inside, page inert')

  // focus trap
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab')
    assert.equal(await activeIsInside(page), true, `Tab ${i + 1} stays inside the dialog`)
  }
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Shift+Tab')
    assert.equal(await activeIsInside(page), true, `Shift+Tab ${i + 1} stays inside the dialog`)
  }
  ok('Tab and Shift+Tab never leave the dialog')

  // previous / next switch the card without losing the original trigger
  await page.locator('[data-agent-card="qa"] [data-agent-go="docs"]').click()
  assert.equal(await title(page), 'Docs')
  await page.locator('[data-agent-card="docs"] [data-agent-go="qa"]').click()
  assert.equal(await title(page), 'QA')
  ok('next / previous buttons switch between agent cards')

  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#agent-dialog').isHidden(), true)
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-agent')), 'qa')
  assert.equal(await page.locator('main').evaluate((el) => el.inert), false)
  ok('Escape closes the card, focus returns to the QA button, page is no longer inert')

  // the close button and a click outside close it too; the trigger gets focus each time
  const planner = page.locator('.agent[data-agent="planner"]')
  await planner.click()
  await dialog(page).waitFor({ state: 'visible' })
  assert.equal(await title(page), 'Planner')
  await page.locator('.agent-dialog__close').click()
  assert.equal(await page.locator('#agent-dialog').isHidden(), true)
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-agent')), 'planner')
  await planner.click()
  await dialog(page).waitFor({ state: 'visible' })
  await page.waitForTimeout(600) // past the ghost-click guard
  await page.mouse.click(60, 450) // the backdrop, left of the card
  assert.equal(await page.locator('#agent-dialog').isHidden(), true)
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-agent')), 'planner')
  ok('✕ and a click outside both close the card and return focus to the trigger')

  // every agent has a card with its own name
  for (const [id, name] of [
    ['lead', 'Lead'],
    ['backend', '.NET Backend'],
    ['frontend', 'React Frontend'],
    ['devops', 'DevOps'],
  ]) {
    await page.locator(`.agent[data-agent="${id}"]`).click()
    await dialog(page).waitFor({ state: 'visible' })
    assert.equal(await title(page), name)
    await page.keyboard.press('Escape')
  }
  ok('Lead, .NET Backend, React Frontend and DevOps open their own cards')

  if (out) {
    await page.locator('.agent[data-agent="backend"]').click()
    await dialog(page).waitFor({ state: 'visible' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${out}/e2e-desktop-card.png` })
    await page.keyboard.press('Escape')
  }
  assert.deepEqual(errors, [])
  await ctx.close()
}

// ── Phone: a bottom sheet with big touch targets ──────────────────────────────
{
  const { ctx, page, errors } = await openPage({ width: 390, height: 844 }, { touch: true })
  if (webgl) await waitScene(page)
  const lead = page.locator('.agent[data-agent="lead"]')
  await lead.scrollIntoViewIfNeeded()
  await lead.tap()
  await dialog(page).waitFor({ state: 'visible' })
  await page.waitForTimeout(1500) // the sheet slides in (slowly under software WebGL)
  const box = await dialog(page).boundingBox()
  const close = await page.locator('.agent-dialog__close').boundingBox()
  assert.ok(box.x >= 0 && box.x + box.width <= 390 + 0.5, 'sheet inside the viewport width')
  assert.ok(Math.abs(box.y + box.height - 844) < 2, 'sheet sits on the bottom edge')
  assert.ok(close.width >= 48 && close.height >= 48, `close button is a touch target (${close.width}x${close.height})`)
  assert.ok(
    close.x + close.width <= 390 && close.y >= 0 && close.y + close.height <= 844,
    'close button inside the viewport',
  )
  const nav = await page.locator('[data-agent-card="lead"] [data-agent-go]').boundingBox()
  assert.ok(nav.height >= 48, `step buttons are touch targets (${nav.height}px)`)
  ok('phone: bottom sheet inside the viewport, close and step buttons >= 48 px')
  await page.waitForTimeout(600)
  await page.locator('.agent-dialog__close').tap()
  assert.equal(await page.locator('#agent-dialog').isHidden(), true)
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-agent')), 'lead')
  ok('phone: ✕ tap closes the sheet, focus returns to the Lead button')
  if (out) {
    await lead.tap()
    await dialog(page).waitFor({ state: 'visible' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${out}/e2e-phone-card.png` })
  }
  assert.deepEqual(errors, [])
  await ctx.close()
}

// ── Reduced motion: the DOM buttons still open the card ───────────────────────
{
  const { ctx, page, errors } = await openPage({ width: 1440, height: 900 }, { reducedMotion: true })
  if (webgl) await waitScene(page)
  const devops = page.locator('.agent[data-agent="devops"]')
  await devops.scrollIntoViewIfNeeded()
  await devops.click()
  await dialog(page).waitFor({ state: 'visible' })
  assert.equal(await title(page), 'DevOps')
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-agent')), 'devops')
  ok('reduced motion: the strip button opens and closes the card')
  assert.deepEqual(errors, [])
  await ctx.close()
}

// ── WebGL: clicking a 3D panel opens the same card ────────────────────────────
if (webgl) {
  // Reduced motion pins the About pose, so panel positions on screen are fixed (1440x900: Lead is mid-right).
  const { ctx, page, errors } = await openPage({ width: 1440, height: 900 }, { reducedMotion: true })
  await waitScene(page)
  await page.waitForFunction(() => document.getElementById('scene').dataset.sceneState === 'still')
  await page.waitForTimeout(1500)
  assert.equal(await page.evaluate(() => document.getElementById('scene').dataset.camera), 'settled')

  // a drag (scroll-like movement) over a panel is not a tap
  await page.mouse.move(1058, 430)
  await page.mouse.down()
  await page.mouse.move(1058, 520, { steps: 4 })
  await page.mouse.up()
  assert.equal(await page.locator('#agent-dialog').isHidden(), true, 'a drag does not open a card')
  ok('webgl: a press-drag-release over a panel does not open a card')

  // a click on a bare spot of the room does not either
  await page.mouse.click(1000, 800)
  assert.equal(await page.locator('#agent-dialog').isHidden(), true)

  await page.mouse.click(1058, 430)
  await dialog(page).waitFor({ state: 'visible', timeout: 5000 })
  assert.equal(await title(page), 'Lead')
  ok('webgl: a click on the centre panel opens the Lead card')
  await page.waitForTimeout(1500)
  assert.equal(
    await page.evaluate(() => document.getElementById('scene').dataset.camera),
    'settled',
    'no camera move under reduced motion',
  )
  ok('webgl: reduced motion keeps the camera still while the card is open')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#agent-dialog').isHidden(), true)
  ok('webgl: Escape closes the card opened from the canvas')
  assert.deepEqual(errors, [])
  await ctx.close()
}

await browser.close()
console.log(`\nall ${step} agent-card checks passed${webgl ? ' (webgl)' : ' (poster)'}`)
