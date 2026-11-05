/**
 * WCAG contrast of the text on the glass cards, measured on the real pixels behind each text element over the live 3D scene.
 * For each chapter the page is scrolled to its anchor, every text element inside a card is listed with its colour and box,
 * then the text is made transparent and the page screenshotted: the pixels in each box are the true backdrop (scene, blur,
 * dimming, glass fill). The brightest 2% of those pixels is the worst case under the text; the ratio uses that.
 *   node scripts/contrast-check.mjs [url] [--only=desktop|laptop|phone]     (a built site, `npm run preview`)
 * Needs 4.5:1 for body text and 3:1 for large text (>= 24 px, or >= 18.66 px bold). Exit code 1 below that.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const url = positional[0] ?? 'http://localhost:4361/immanuel-3d/'
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
const CHAPTERS = ['about', 'experience', 'ai', 'web', 'education', 'contact']
const sizes = [
  { name: 'desktop', width: 1440, height: 900, tier: 'high', touch: false },
  { name: 'laptop', width: 1024, height: 768, tier: 'high', touch: false },
  { name: 'phone', width: 390, height: 844, tier: 'low', touch: true },
].filter((s) => !only || s.name === only)

const lin = (c) => {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const luminance = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
let failed = 0
try {
  for (const size of sizes) {
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      hasTouch: size.touch,
      isMobile: size.touch,
      deviceScaleFactor: 1,
    })
    const page = await ctx.newPage()
    await page.goto(`${url}?tier=${size.tier}`)
    await page.mouse.wheel(0, 1)
    await page.waitForFunction(() => document.getElementById('scene')?.dataset.sceneState === 'ready', null, {
      timeout: 240000,
    })
    await page.waitForTimeout(2500)
    console.log(`\n${size.name} ${size.width}x${size.height} (${size.tier} tier)`)
    for (const id of CHAPTERS) {
      await page.evaluate((chapter) => {
        const el = document.getElementById(chapter)
        const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5
        window.scrollTo({ top: chapter === 'about' ? 0 : top + 2, behavior: 'instant' })
      }, id)
      await page.waitForFunction((c) => document.getElementById('scene').dataset.chapter === c, id)
      await page
        .waitForFunction(() => document.getElementById('scene').dataset.camera === 'moving', null, { timeout: 4000 })
        .catch(() => {})
      await page.waitForFunction(() => document.getElementById('scene').dataset.camera === 'settled', null, {
        timeout: 120000,
      })
      await page.waitForTimeout(1500)
      const items = await page.evaluate(() => {
        const out = []
        const vw = window.innerWidth
        const vh = window.innerHeight
        for (const el of document.querySelectorAll('.chapter__inner *')) {
          if (el.closest('[hidden]') || el.closest('svg') || el.classList.contains('sr-only') || el.closest('.sr-only'))
            continue
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)
          if (!own) continue
          const r = el.getBoundingClientRect()
          // inset: a button's own border or a chip's outline is not the backdrop of its text
          const small = Math.min(r.width, r.height)
          const inset = small < 48 ? small * 0.25 : 4
          const x0 = Math.max(0, r.left) + Math.max(0, inset)
          const y0 = Math.max(64, r.top) + Math.max(0, inset) // below the sticky header
          const x1 = Math.min(vw, r.right) - Math.max(0, inset)
          const y1 = Math.min(vh - (vw < 640 ? 84 : 0), r.bottom) - Math.max(0, inset) // phone: the sticky CV bar covers the bottom
          if (x1 - x0 < 4 || y1 - y0 < 4) continue
          const cs = getComputedStyle(el)
          if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue
          out.push({
            text: el.textContent.trim().slice(0, 40),
            x0: Math.round(x0),
            y0: Math.round(y0),
            x1: Math.round(x1),
            y1: Math.round(y1),
            color: cs.color,
            size: parseFloat(cs.fontSize),
            weight: Number(cs.fontWeight),
          })
        }
        const style = document.createElement('style')
        style.id = 'contrast-probe'
        style.textContent = '.chapter__inner *{color:transparent!important;text-shadow:none!important}'
        document.head.append(style)
        return out
      })
      await page.waitForTimeout(400)
      const png = await page.screenshot()
      await page.evaluate(() => document.getElementById('contrast-probe')?.remove())
      const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      let worst = { ratio: Infinity }
      for (const it of items) {
        const m = it.color.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255]
        const [r, g, b] = it.color.startsWith('color(') ? m.slice(0, 3).map((v) => v * 255) : m
        const lt = luminance(r, g, b)
        const lums = []
        for (let y = it.y0; y < it.y1; y += 2) {
          for (let x = it.x0; x < it.x1; x += 2) {
            const i = (y * info.width + x) * 3
            lums.push(luminance(data[i], data[i + 1], data[i + 2]))
          }
        }
        lums.sort((a, c) => a - c)
        const lb = lums[Math.min(lums.length - 1, Math.floor(lums.length * 0.98))]
        const large = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700)
        const need = large ? 3 : 4.5
        const got = ratio(lt, lb)
        if (got / need < worst.ratio / (worst.need ?? 4.5))
          worst = {
            ratio: got,
            need,
            text: it.text,
            size: it.size,
            color: it.color,
            lb,
            box: [it.x0, it.y0, it.x1, it.y1],
          }
      }
      const ok = worst.ratio >= worst.need
      if (!ok) failed += 1
      console.log(
        `${ok ? 'ok  ' : 'FAIL'}  ${id.padEnd(10)} ${items.length} text boxes, worst ${worst.ratio.toFixed(2)}:1 (needs ${worst.need}) "${worst.text}"` +
          (ok ? '' : ` ${worst.color} backdrop L=${worst.lb.toFixed(3)} box ${worst.box}`),
      )
    }
    await ctx.close()
  }
} finally {
  await browser.close()
}
console.log(failed === 0 ? '\nAll text meets WCAG AA over the scene.' : `\n${failed} chapter(s) below AA.`)
process.exit(failed === 0 ? 0 : 1)
