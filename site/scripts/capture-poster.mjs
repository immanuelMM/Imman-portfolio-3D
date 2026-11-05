/**
 * Renders the real hero frame (the About pose, reduced-motion still, software WebGL) and writes the poster files:
 *   public/poster/poster-hero-desktop.webp   1920x1080, high tier
 *   public/poster/poster-hero-tablet.webp    820x1180, touch tier (portrait tablet)
 *   public/poster/poster-hero-phone.webp     375x667 at 2x, low tier (touch phone)
 *   public/og.png                            1200x630 (high tier) with the name and title set in the empty left half
 * Each webp is encoded at the highest quality that fits the 120 KB poster budget (plan section 5).
 * The CSS vignette (#scene::after) and the poster layer are hidden for the capture: the page paints the vignette over the
 * poster and the canvas alike, so the crossfade between them carries no jump. The tier is pinned with `?tier=` so the frame-rate
 * monitor cannot step the look down while software WebGL renders slowly.
 * Usage: build and serve the site (npm run build && npm run preview), then
 *   node scripts/capture-poster.mjs http://localhost:4361/immanuel-3d/ [filter, e.g. tablet]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const url = process.argv[2] ?? 'http://localhost:4361/immanuel-3d/'
const only = process.argv[3] ? new RegExp(process.argv[3]) : null
const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
const BUDGET = 120 * 1024
await mkdir(path.join(pub, 'poster'), { recursive: true })

// Crops are chosen in CSS by aspect ratio and scaled to the screen height (cover), so each is captured at the widest aspect
// it serves: the picture then matches the canvas (whose camera is also fixed to the height).
const shots = [
  {
    name: 'desktop',
    viewport: { width: 1920, height: 1080 },
    scale: 1,
    tier: 'high',
    file: 'poster/poster-hero-desktop.webp',
  },
  {
    name: 'tablet',
    viewport: { width: 820, height: 1180 },
    scale: 1,
    tier: 'touch',
    mobile: true,
    file: 'poster/poster-hero-tablet.webp',
  },
  {
    name: 'phone',
    viewport: { width: 375, height: 667 },
    scale: 2,
    tier: 'low',
    mobile: true,
    file: 'poster/poster-hero-phone.webp',
  },
  { name: 'og', viewport: { width: 1200, height: 630 }, scale: 1, tier: 'high', file: 'og.png' },
]

async function encodeWithin(png, file) {
  for (let quality = 88; quality >= 40; quality -= 4) {
    const out = await sharp(png).webp({ quality, effort: 6, smartSubsample: true }).toBuffer()
    if (out.length <= BUDGET) {
      await writeFile(file, out)
      return { quality, bytes: out.length }
    }
  }
  throw new Error(`${file} does not fit ${BUDGET} bytes even at quality 40`)
}

/** The og image: the real frame with the name and title set in the dark left half, where the page's card sits. */
async function writeOg(png, file) {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
      <text x="64" y="270" font-family="Segoe UI, Arial, sans-serif" font-size="30" letter-spacing="4" fill="#5ee7ff">SOFTWARE ENGINEER</text>
      <text x="64" y="352" font-family="Segoe UI, Arial, sans-serif" font-size="80" font-weight="700" fill="#e8eef5">Immanuel</text>
      <text x="64" y="436" font-family="Segoe UI, Arial, sans-serif" font-size="80" font-weight="700" fill="#e8eef5">Mahusay</text>
      <text x="64" y="492" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#9fb0c0">AI agents, full stack web, automation</text>
    </svg>`,
  )
  await sharp(png)
    .composite([{ input: svg }])
    .png({ compressionLevel: 9, palette: true, quality: 85 })
    .toFile(file)
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
try {
  for (const s of shots) {
    if (only && !only.test(s.name)) continue
    const ctx = await browser.newContext({
      viewport: s.viewport,
      deviceScaleFactor: s.scale,
      isMobile: s.mobile ?? false,
      hasTouch: s.mobile ?? false,
      reducedMotion: 'reduce',
    })
    const page = await ctx.newPage()
    await page.goto(`${url}?tier=${s.tier}`, { waitUntil: 'load' })
    await page.mouse.move(5, 5)
    await page.mouse.wheel(0, 1)
    await page.waitForFunction(() => document.getElementById('scene')?.dataset.sceneState === 'still', null, {
      timeout: 240000,
    })
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(8000) // textures, the one shadow refresh and the first settled frame
    const tier = await page.evaluate(() => document.getElementById('scene').dataset.tier)
    if (tier !== s.tier) throw new Error(`${s.name}: tier is ${tier}, expected ${s.tier}`)
    // Inline !important beats every cascade layer (a layered `!important` rule outranks an unlayered one).
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body > :not(#scene)'))
        el.style.setProperty('visibility', 'hidden', 'important')
      document.querySelector('.scene-poster')?.style.setProperty('display', 'none', 'important')
      const style = document.createElement('style')
      style.textContent = '#scene::after{display:none!important}'
      document.head.append(style)
    })
    // software WebGL composites slowly on the high tier: let two frames pass or the shot can still show the page UI
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    await page.waitForTimeout(3000)
    const png = await page.screenshot()
    const out = path.join(pub, s.file)
    if (s.file.endsWith('.png')) {
      await writeOg(png, out)
      console.log('wrote', s.file)
    } else {
      const { quality, bytes } = await encodeWithin(png, out)
      console.log('wrote', s.file, `quality ${quality}, ${Math.round(bytes / 1024)} KB`)
    }
    await ctx.close()
  }
} finally {
  await browser.close()
}
