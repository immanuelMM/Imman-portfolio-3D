// Full-page screenshots at the plan's viewports against a running preview.
// node scripts/shots.mjs <outDir> [url] [--webgl]   (default: poster mode, no WebGL)
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const [outDir, url = 'http://localhost:4361/immanuel-3d/'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const webgl = process.argv.includes('--webgl')
const sizes = [
  ['desktop-1440x900', 1440, 900],
  ['ipad-pro-1024x1366', 1024, 1366],
  ['tablet-820x1180', 820, 1180],
  ['phone-390x844', 390, 844],
  ['phone-360x740', 360, 740],
]
const args = webgl
  ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
  : ['--disable-webgl', '--disable-3d-apis']

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true, args })
for (const [name, width, height] of sizes) {
  const touch = width < 1024
  const ctx = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch,
    isMobile: touch,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  await page.goto(url)
  await page.waitForTimeout(500)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  await page.screenshot({ path: `${outDir}/${name}-top.png` })
  await page.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true })
  console.log(name, 'horizontal overflow px:', overflow)
  await ctx.close()
}
await browser.close()
