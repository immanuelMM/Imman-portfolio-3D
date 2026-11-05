// Screenshots of the WebGL hero render (swiftshader) against a running dev or preview server.
// node scripts/scene-shots.mjs <outDir> [url] [--only=desktop|tablet|phone] [--tag=name] [--wait=ms]
// Viewports follow the plan: desktop 1440x900 (high tier), tablet 820x1180 (touch tier), phone 390x844 (low tier).
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const flag = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const outDir = positional[0]
const url = positional[1] ?? 'http://localhost:4360/immanuel-3d/'
const only = flag('only', '')
const tag = flag('tag', 'hero')
const wait = Number(flag('wait', '2500'))
const sizes = [
  ['desktop', 1440, 900, false],
  ['tablet', 820, 1180, true],
  ['phone', 390, 844, true],
].filter(([name]) => !only || only === name)

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
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
    if (/\[scene\]/.test(text)) console.log(name, text)
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url)
  await page.mouse.move(width / 2, height / 2)
  await page.mouse.wheel(0, 1)
  await page.waitForFunction(
    () => ['ready', 'still', 'poster', 'lost'].includes(document.getElementById('scene')?.dataset.sceneState ?? ''),
    null,
    { timeout: 90000 },
  )
  await page.waitForTimeout(wait)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(600)
  const state = await page.evaluate(() => document.getElementById('scene').dataset.sceneState)
  // the scene layer alone (no HTML cards), and the page as a visitor sees it
  await page.screenshot({ path: `${outDir}/${name}-${tag}-page.png` })
  await page.addStyleTag({ content: 'body > *:not(#scene){visibility:hidden !important}' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outDir}/${name}-${tag}-scene.png` })
  console.log(name, width + 'x' + height, 'state:', state, 'errors:', errors.length)
  errors.slice(0, 5).forEach((e) => console.log('   ', e.slice(0, 300)))
  await ctx.close()
}
await browser.close()
