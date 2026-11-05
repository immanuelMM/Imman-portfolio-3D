/**
 * Measures how far the poster is from the real canvas frame it fades into (mean absolute difference per colour channel,
 * 0-255; plan S3 asks for <= 4) at several viewport sizes. Both pictures are taken without the page UI and without the CSS
 * vignette, which sits over poster and canvas alike.
 *   node scripts/poster-diff.mjs [url]     (a built site served by `npm run preview`)
 */
import { chromium } from 'playwright'
import sharp from 'sharp'

const url = process.argv[2] ?? 'http://localhost:4361/immanuel-3d/'
const swift = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
const sizes = [
  { name: 'desktop 1440x900', width: 1440, height: 900, tier: 'high' },
  { name: 'laptop 1280x720', width: 1280, height: 720, tier: 'high' },
  { name: 'tablet 820x1180', width: 820, height: 1180, tier: 'touch', mobile: true },
  { name: 'phone 390x844', width: 390, height: 844, tier: 'low', mobile: true },
  { name: 'phone 375x667', width: 375, height: 667, tier: 'low', mobile: true },
]

const hide = () => {
  for (const el of document.querySelectorAll('body > :not(#scene)'))
    el.style.setProperty('visibility', 'hidden', 'important')
  const style = document.createElement('style')
  style.textContent = '#scene::after{display:none!important}'
  document.head.append(style)
}
const settle = (page) =>
  page
    .evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    .then(() => page.waitForTimeout(3000))

async function shot(browser, size, mode) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    isMobile: size.mobile ?? false,
    hasTouch: size.mobile ?? false,
    reducedMotion: 'reduce',
  })
  const page = await ctx.newPage()
  await page.goto(`${url}?tier=${size.tier}`, { waitUntil: 'load' })
  if (mode === 'canvas') {
    await page.mouse.wheel(0, 1)
    await page.waitForFunction(() => document.getElementById('scene')?.dataset.sceneState === 'still', null, {
      timeout: 240000,
    })
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(8000)
    await page.evaluate(() =>
      document.querySelector('.scene-poster')?.style.setProperty('display', 'none', 'important'),
    )
  } else {
    await page.waitForFunction(() => document.getElementById('scene')?.dataset.sceneState === 'poster', null, {
      timeout: 20000,
    })
    await page.waitForLoadState('networkidle').catch(() => {})
  }
  await page.evaluate(hide)
  await settle(page)
  const png = await page.screenshot()
  await ctx.close()
  return png
}

const poster = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-webgl', '--disable-3d-apis'],
})
const canvas = await chromium.launch({ channel: 'chrome', headless: true, args: swift })
let worst = 0
try {
  for (const size of sizes) {
    const a = await shot(poster, size, 'poster')
    const b = await shot(canvas, size, 'canvas')
    const [ra, rb] = await Promise.all(
      [a, b].map((png) => sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })),
    )
    let sum = 0
    for (let i = 0; i < ra.data.length; i++) sum += Math.abs(ra.data[i] - rb.data[i])
    const mean = sum / ra.data.length
    worst = Math.max(worst, mean)
    console.log(`${size.name.padEnd(18)} mean diff ${mean.toFixed(2)} / 255`)
  }
} finally {
  await poster.close()
  await canvas.close()
}
console.log(worst <= 4 ? `ok: worst ${worst.toFixed(2)} <= 4` : `over: worst ${worst.toFixed(2)} > 4`)
process.exit(worst <= 4 ? 0 : 1)
