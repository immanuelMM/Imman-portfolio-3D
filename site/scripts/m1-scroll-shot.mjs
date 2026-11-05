// Scrolls to each card image and screenshots the viewport: node scripts/m1-scroll-shot.mjs <outDir>
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
const out = process.argv[2]
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-webgl', '--disable-3d-apis'],
})
for (const [name, w, h] of [
  ['desktop', 1440, 900],
  ['phone', 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto('http://localhost:4361/immanuel-3d/')
  for (const id of ['experience', 'ai', 'web', 'education', 'contact']) {
    await page.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: 'instant', block: 'start' }), id)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${out}/${name}-${id}.png` })
  }
  const broken = await page.evaluate(
    () => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length,
  )
  console.log(name, 'broken images after scroll:', broken)
  await page.close()
}
await browser.close()
