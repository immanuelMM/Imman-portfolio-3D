// Glass chapter cards against a running preview (npm run build && npm run preview):
//   node e2e/glass.spec.mjs [--url=http://localhost:4361/immanuel-3d/]
// Runs without WebGL (the scene is the poster): everything here is the DOM contract.
//  - experience entries: first open, the rest collapsed; the role is a button with aria-expanded; click, Enter and a touch tap toggle
//  - the printed CV still lists every bullet, collapsed or not
//  - hover, keyboard focus and a touch tap on an agent item or a project card publish #scene[data-highlight]; click still opens the card
//  - fine pointer: the card tilts (<= 4 degrees) and carries the highlight; touch and reduced motion: no tilt at all
//  - keyboard focus ring on the expand button; the glass card really has a backdrop blur
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const url = arg('url', 'http://localhost:4361/immanuel-3d/')
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-webgl', '--disable-3d-apis'],
})
let step = 0
const ok = (msg) => console.log(`ok ${++step} - ${msg}`)

async function open(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url)
  await page.waitForFunction(() => document.getElementById('scene')?.dataset.sceneState === 'poster')
  return { ctx, page, errors }
}
const expanded = (page) => page.$$eval('[data-expand-toggle]', (bs) => bs.map((b) => b.getAttribute('aria-expanded')))
const panelsHidden = (page) => page.$$eval('[data-expand-panel]', (ps) => ps.map((p) => p.hidden))
const highlight = (page) => page.evaluate(() => document.getElementById('scene').dataset.highlight ?? null)

// ── Desktop, mouse ───────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await open()
  const count = await page.locator('[data-expand-toggle]').count()
  assert.ok(count >= 3, 'several experience entries')
  const first = await expanded(page)
  assert.deepEqual(first, ['true', ...Array(count - 1).fill('false')])
  assert.deepEqual(await panelsHidden(page), [false, ...Array(count - 1).fill(true)])
  ok(`experience: ${count} entries, the first open, the rest collapsed to role, company and dates`)

  const toggles = page.locator('[data-expand-toggle]')
  const controls = await toggles.nth(1).getAttribute('aria-controls')
  assert.ok(controls && (await page.locator(`#${controls}`).count()) === 1, 'aria-controls points at the bullets')
  await toggles.nth(1).scrollIntoViewIfNeeded()
  await toggles.nth(1).click()
  assert.equal(await toggles.nth(1).getAttribute('aria-expanded'), 'true')
  assert.equal(await page.locator(`#${controls}`).isVisible(), true)
  await toggles.nth(1).click()
  assert.equal(await toggles.nth(1).getAttribute('aria-expanded'), 'false')
  assert.equal(await page.locator(`#${controls}`).isVisible(), false)
  ok('click on the role toggles aria-expanded and shows or hides the bullets')

  await toggles.nth(2).focus()
  await page.keyboard.press('Enter')
  assert.equal(await toggles.nth(2).getAttribute('aria-expanded'), 'true')
  await page.keyboard.press('Space')
  assert.equal(await toggles.nth(2).getAttribute('aria-expanded'), 'false')
  ok('Enter and Space on the focused button toggle it')

  const ring = await toggles.nth(2).evaluate((el) => getComputedStyle(el).boxShadow)
  assert.notEqual(ring, 'none')
  ok('the focused expand button shows a focus ring')

  // print: the CV document lists every bullet of every entry, whatever is collapsed on screen
  const bullets = await page.$$eval('[data-expand-panel] li', (lis) => lis.map((li) => li.textContent.trim()))
  assert.ok(bullets.length > 10)
  await page.emulateMedia({ media: 'print' })
  const cv = await page.locator('#cv-print').innerText()
  const body = await page.evaluate(() => getComputedStyle(document.querySelector('#cv-print')).display)
  assert.equal(body, 'block')
  for (const b of bullets) assert.ok(cv.includes(b), `print CV lists: ${b.slice(0, 50)}`)
  assert.equal(await page.locator('.chapter__inner').first().isVisible(), false, 'the page itself is not printed')
  await page.emulateMedia({ media: 'screen' })
  ok(`print CV includes all ${bullets.length} experience bullets (page hidden in print)`)

  // glass
  const filter = await page.locator('#experience .chapter__inner').evaluate((el) => getComputedStyle(el).backdropFilter)
  assert.match(filter, /blur\(14px\)/)
  const fill = await page.locator('#experience .chapter__inner').evaluate((el) => getComputedStyle(el).backgroundColor)
  assert.match(fill, /^rgba\(10, 14, 20, 0\.3/)
  ok(`chapter card is glass: ${filter}, fill ${fill}`)

  // contact keeps its solid look and never tilts
  const contact = page.locator('#contact .chapter__inner')
  await contact.scrollIntoViewIfNeeded()
  const cbox = await contact.boundingBox()
  await page.mouse.move(cbox.x + cbox.width * 0.9, cbox.y + cbox.height * 0.2, { steps: 3 })
  await page.waitForTimeout(300)
  const solid = await contact.evaluate((el) => ({
    fill: getComputedStyle(el).backgroundColor,
    transform: getComputedStyle(el).transform,
    hot: el.hasAttribute('data-hot'),
  }))
  assert.equal(solid.transform, 'none')
  assert.equal(solid.hot, false)
  assert.match(solid.fill, /0\.88\)$/) // the original panel: 88% of the surface colour
  ok(`contact card stays solid (${solid.fill}) and does not tilt`)

  // highlight: hover, keyboard focus, click still opens the card
  await page.locator('#ai').scrollIntoViewIfNeeded()
  const qa = page.locator('.agent[data-agent="qa"]')
  await qa.scrollIntoViewIfNeeded()
  await qa.hover()
  assert.equal(await highlight(page), 'agent:qa')
  await page.mouse.move(5, 5)
  assert.equal(await highlight(page), null)
  await page.locator('.agent[data-agent="lead"]').focus()
  assert.equal(await highlight(page), 'agent:lead')
  await page.locator('.agent[data-agent="lead"]').blur()
  assert.equal(await highlight(page), null)
  ok('hover and keyboard focus on an agent item publish and clear the 3D highlight')

  const project = page.locator('#ai .project[data-hl^="screen:"]').first()
  await project.scrollIntoViewIfNeeded()
  const want = await project.getAttribute('data-hl')
  await project.hover()
  assert.equal(await highlight(page), want)
  await page.mouse.move(5, 5)
  assert.equal(await highlight(page), null)
  ok(`hovering a project card publishes ${want}`)

  await qa.scrollIntoViewIfNeeded()
  await qa.click()
  assert.equal(await page.locator('[role="dialog"]').isVisible(), true)
  await page.keyboard.press('Escape')
  ok('clicking an agent item still opens its detail card')

  // tilt: leans toward the cursor, at most 4 degrees, resets on leave
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  const card = page.locator('#about .chapter__inner')
  const box = await card.boundingBox()
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2, { steps: 4 })
  await page.waitForFunction(() => document.querySelector('#about .chapter__inner').hasAttribute('data-hot'))
  const tilt = await card.evaluate((el) => ({
    ry: parseFloat(el.style.getPropertyValue('--ry')),
    rx: parseFloat(el.style.getPropertyValue('--rx')),
    transform: getComputedStyle(el).transform,
  }))
  assert.ok(tilt.ry > 1 && tilt.ry <= 4, `ry ${tilt.ry}`)
  assert.ok(tilt.rx > 0 && tilt.rx <= 4, `rx ${tilt.rx}`)
  await page.mouse.move(5, 5, { steps: 2 })
  await page.waitForFunction(() => !document.querySelector('#about .chapter__inner').hasAttribute('data-hot'))
  ok(`fine pointer: card leans toward the cursor (ry ${tilt.ry}deg, rx ${tilt.rx}deg) and resets when it leaves`)
  assert.deepEqual(errors, [])
  await ctx.close()
}

// ── Reduced motion: no tilt, static glass ───────────────────────────────────
{
  const { ctx, page } = await open({ reducedMotion: 'reduce' })
  const card = page.locator('#about .chapter__inner')
  const box = await card.boundingBox()
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2, { steps: 4 })
  await page.waitForTimeout(400)
  const state = await card.evaluate((el) => ({
    hot: el.hasAttribute('data-hot'),
    ry: el.style.getPropertyValue('--ry'),
    transform: getComputedStyle(el).transform,
    filter: getComputedStyle(el).backdropFilter,
  }))
  assert.equal(state.hot, false)
  assert.equal(state.ry, '')
  assert.equal(state.transform, 'none')
  assert.match(state.filter, /blur/)
  ok('reduced motion: no tilt and no highlight, the glass stays')
  await ctx.close()
}

// ── Touch: no tilt, but tap-to-expand and tap-to-highlight work ──────────────
{
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const toggles = page.locator('[data-expand-toggle]')
  await toggles.nth(1).scrollIntoViewIfNeeded()
  await toggles.nth(1).tap()
  assert.equal(await toggles.nth(1).getAttribute('aria-expanded'), 'true')
  const target = await toggles.nth(1).boundingBox()
  assert.ok(target.height >= 48, `expand button height ${target.height}`)
  await toggles.nth(1).tap()
  assert.equal(await toggles.nth(1).getAttribute('aria-expanded'), 'false')
  ok('touch: tapping the role expands and collapses (button >= 48 px high)')

  const card = page.locator('#about .chapter__inner')
  assert.equal(await card.evaluate((el) => getComputedStyle(el).transform), 'none')
  const lead = page.locator('.agent[data-agent="lead"]')
  await lead.scrollIntoViewIfNeeded()
  await page.evaluate(() => document.querySelector('.agent[data-agent="qa"]').scrollIntoView({ block: 'center' }))
  const qa = page.locator('.agent[data-agent="qa"]')
  await qa.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true })
  assert.equal(await highlight(page), 'agent:qa')
  await page.locator('#ai h2').dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true })
  assert.equal(await highlight(page), null)
  ok('touch: no tilt; a tap on an agent item highlights it and a tap elsewhere clears it')
  const filter = await page.locator('#experience .chapter__inner').evaluate((el) => getComputedStyle(el).backdropFilter)
  assert.match(filter, /blur\(8px\)/)
  ok(`phone tier glass uses the cheaper blur: ${filter}`)
  await ctx.close()
}

await browser.close()
console.log(`\nall ${step} glass-card checks passed`)
