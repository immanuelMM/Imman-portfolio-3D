// Chapter and detail-card screenshots (swiftshader WebGL) against a running dev or preview server.
//   node scripts/s2-shots.mjs <outDir> [url] [--only=desktop|tablet|phone|phone2] [--skip-chapters] [--skip-card] [--agent=qa]
// Per viewport and chapter: <name>-<chapter>-page.png (as a visitor sees it) and -scene.png (the 3D layer alone), then the
// open detail card (<name>-card-<agent>.png) with a printed check that the card and its close button are inside the viewport.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const flag = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const has = (name) => process.argv.includes(`--${name}`)
const outDir = positional[0]
const url = positional[1] ?? 'http://localhost:4360/immanuel-3d/'
const only = flag('only', '')
const agent = flag('agent', 'qa')
const CHAPTERS = ['about', 'experience', 'ai', 'web', 'education', 'contact']
const sizes = [
  ['desktop', 1440, 900, false],
  ['laptop', 1024, 768, false],
  ['tablet', 820, 1180, true],
  ['phone', 390, 844, true],
  ['phone2', 360, 740, true],
].filter(([name]) => !only || only === name)

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})

async function settle(page, chapter) {
  if (chapter) await page.waitForFunction((id) => document.getElementById('scene').dataset.chapter === id, chapter)
  // The data-camera flag stays "settled" until the next frame notices the new target: give it time to flip to "moving" first.
  await page
    .waitForFunction(() => document.getElementById('scene').dataset.camera === 'moving', null, { timeout: 4000 })
    .catch(() => {})
  await page.waitForFunction(() => document.getElementById('scene').dataset.camera === 'settled', null, {
    timeout: 90000,
  })
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.waitForTimeout(500)
}

for (const [name, width, height, touch] of sizes) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch,
    isMobile: touch,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => {
    const text = m.text()
    if (m.type() === 'error' && !/THREE\.Clock/.test(text)) errors.push(text)
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url)
  await page.mouse.move(width / 2, height / 2)
  await page.mouse.wheel(0, 1)
  await page.waitForFunction(
    () => ['ready', 'still', 'poster', 'lost'].includes(document.getElementById('scene')?.dataset.sceneState ?? ''),
    null,
    { timeout: 150000 },
  )
  await page.waitForTimeout(2500)
  const state = await page.evaluate(() => document.getElementById('scene').dataset.sceneState)
  console.log(name, `${width}x${height}`, 'state:', state)

  const goTo = async (id) => {
    await page.evaluate((chapter) => {
      const el = document.getElementById(chapter)
      const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5
      window.scrollTo({ top: chapter === 'about' ? 0 : top + 2, behavior: 'instant' })
    }, id)
    await settle(page, id)
  }

  if (!has('skip-chapters')) {
    for (const id of CHAPTERS) {
      await goTo(id)
      await page.screenshot({ path: `${outDir}/${name}-${id}-page.png` })
      await page
        .addStyleTag({ content: 'body > *:not(#scene){visibility:hidden !important}' })
        .then((h) => h.evaluate((el) => (el.id = 'hide-ui')))
      await page.waitForTimeout(250)
      await page.screenshot({ path: `${outDir}/${name}-${id}-scene.png` })
      await page.evaluate(() => document.getElementById('hide-ui')?.remove())
    }
  }

  if (!has('skip-card')) {
    await goTo('ai')
    const button = page.locator(`.agent[data-agent="${agent}"]`)
    await button.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await button.click()
    await page.locator('[role="dialog"]').waitFor({ state: 'visible' })
    await settle(page)
    await page.screenshot({ path: `${outDir}/${name}-card-${agent}.png` })
    const fit = await page.evaluate(() => {
      const box = (sel) => {
        const r = document.querySelector(sel).getBoundingClientRect()
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
      }
      const inside = (r) => r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight
      const sheet = box('[role="dialog"]')
      const close = box('.agent-dialog__close')
      return {
        sheet,
        close,
        sheetInside: inside(sheet),
        closeInside: inside(close),
        closeSize: [close.right - close.left, close.bottom - close.top],
      }
    })
    console.log(
      name,
      'card inside viewport:',
      fit.sheetInside,
      '| close inside:',
      fit.closeInside,
      '| close px:',
      fit.closeSize.map(Math.round).join('x'),
    )
    await page.keyboard.press('Escape')
  }
  console.log(name, 'console errors:', errors.length)
  errors.slice(0, 5).forEach((e) => console.log('   ', e.slice(0, 300)))
  await ctx.close()
}
await browser.close()
