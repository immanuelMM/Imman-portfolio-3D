// Download CV check against a running preview (npm run build && npm run preview):
//   node e2e/cv.spec.mjs [--webgl] [--reduced] [--url=http://localhost:4361/immanuel-3d/] [--out=<dir for screenshots and the pdf>]
// Plain Playwright + node:assert (no test-runner dependency); Q1 can lift these checks into its projects.
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { strFromU8, unzipSync } from 'fflate'
import { chromium } from 'playwright'

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const url = arg('url', 'http://localhost:4361/immanuel-3d/')
const out = arg('out', '')
const webgl = process.argv.includes('--webgl')
const reduced = process.argv.includes('--reduced') // reduced motion (needs --webgl to reach the `still` scene)
const args = webgl
  ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
  : ['--disable-webgl', '--disable-3d-apis']
const BANNED = ['Highview', 'P2-B2', 'Dec 24', '1991', 'Filipino  •']

const browser = await chromium.launch({ channel: 'chrome', headless: true, args })
let step = 0
const ok = (msg) => console.log(`ok ${++step} - ${msg}`)
if (out) await mkdir(out, { recursive: true })

async function openPage(viewport, touch = false) {
  const ctx = await browser.newContext({
    viewport,
    acceptDownloads: true,
    hasTouch: touch,
    isMobile: touch,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  })
  await ctx.addInitScript(() => {
    window.__printCalls = []
    window.print = () => window.__printCalls.push(document.title)
  })
  const page = await ctx.newPage()
  const errors = []
  page.requests = []
  page.on('request', (r) => page.requests.push(r.url()))
  page.on('console', (m) => m.type() === 'error' && !/THREE\.Clock/.test(m.text()) && errors.push(m.text()))
  await page.goto(url)
  return { ctx, page, errors }
}

// ── Desktop ───────────────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await openPage({ width: 1440, height: 900 })

  // Nav carries the buttons (dropdown) and so does #contact.
  assert.equal(await page.locator('.site-header [data-cv="pdf"]').count(), 1)
  assert.equal(await page.locator('#contact [data-cv="pdf"]').count(), 1)
  assert.equal(await page.locator('#contact [data-cv="word"]').count(), 1)
  assert.equal(await page.locator('[data-cv="pdf"]').filter({ hasText: 'Print / Save as PDF' }).count(), 3) // nav, phone bar, contact
  assert.equal(await page.locator('[data-cv="word"]').filter({ hasText: 'Word (.docx)' }).count(), 3)
  ok('nav and #contact carry "Print / Save as PDF" and "Word (.docx)"')

  await page.locator('.cv-menu > summary').click()
  await page.locator('.cv-menu [data-cv="pdf"]').click()
  const calls = await page.evaluate(() => window.__printCalls)
  assert.deepEqual(calls, ['Immanuel_Mahusay_CV'])
  assert.equal(await page.title(), 'Immanuel_Mahusay_CV') // the stub never fires afterprint, so it stays until we do
  ok('one click -> one window.print() call, title set to the file name during print')
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  assert.match(await page.title(), /Immanuel Mahusay/)
  ok('title restored on afterprint')

  // Print media: only #cv-print shows.
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('#scene').isVisible(), false)
  assert.equal(await page.locator('main').isVisible(), false)
  assert.equal(await page.locator('.site-header').isVisible(), false)
  assert.equal(await page.locator('#cv-print').isVisible(), true)
  const printed = await page.locator('#cv-print').innerText()
  for (const s of BANNED) assert.equal(printed.includes(s), false, `print CV must not contain ${s}`)
  assert.equal(await page.locator('#cv-print img').count(), 0, 'no photo on the CV')
  for (const must of [
    'Immanuel Mahusay',
    'PROFESSIONAL SUMMARY',
    'WORK EXPERIENCE',
    'Apalit, Philippines',
    'Portfolio:',
  ]) {
    assert.equal(printed.includes(must), true, `print CV should contain ${must}`)
  }
  ok('print media: #scene, main and nav hidden, #cv-print visible, no banned strings, no photo')

  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
  const pages = (
    Buffer.from(pdf)
      .toString('latin1')
      .match(/\/Type\s*\/Page[^s]/g) ?? []
  ).length
  assert.ok(pages >= 2, `pdf pages: ${pages}`)
  ok(`page.pdf() gives ${pages} pages`)
  if (out) {
    await import('node:fs/promises').then((fs) => fs.writeFile(`${out}/cv-print.pdf`, pdf))
    await page.setViewportSize({ width: 794, height: 1123 })
    await page.screenshot({ path: `${out}/cv-print-emulated-794.png`, fullPage: true })
    for (const [w, h] of [
      [1440, 900],
      [390, 844],
    ]) {
      await page.setViewportSize({ width: w, height: h })
      await page.screenshot({ path: `${out}/cv-print-emulated-${w}x${h}.png` })
    }
  }
  await page.emulateMedia({ media: 'screen' })
  await page.setViewportSize({ width: 1440, height: 900 })

  assert.equal(
    page.requests.some((u) => /\/docx\./.test(u)),
    false,
    'docx chunk must not load before the first Word click',
  )
  ok('docx chunk is not requested before the first Word click')

  // Word: a download named Immanuel_Mahusay_CV.docx, > 5 KB, privacy-clean.
  await page.locator('#contact [data-cv="word"]').scrollIntoViewIfNeeded()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#contact [data-cv="word"]').click(),
  ])
  assert.equal(page.requests.filter((u) => /\/docx\./.test(u)).length, 1, 'docx chunk loads once, on click')
  assert.equal(download.suggestedFilename(), 'Immanuel_Mahusay_CV.docx')
  const file = await download.path()
  const bytes = new Uint8Array(await readFile(file))
  assert.ok(bytes.length > 5000, `docx size ${bytes.length}`)
  const files = unzipSync(bytes)
  const xml = strFromU8(files['word/document.xml'])
  assert.ok(xml.includes('Immanuel Mahusay') && xml.toUpperCase().includes('PROFESSIONAL SUMMARY'))
  for (const s of BANNED) assert.equal(xml.includes(s), false, `docx must not contain ${s}`)
  assert.equal(
    Object.keys(files).some((n) => n.startsWith('word/media/')),
    false,
  )
  ok(`Word click -> ${download.suggestedFilename()} (${bytes.length} bytes), content and privacy checked`)
  await page.waitForFunction(() => document.getElementById('cv-toast')?.textContent === 'Word CV downloaded')
  ok('success toast shown')
  assert.deepEqual(errors, [], 'no console errors')
  ok('no console errors on desktop')
  if (out) await page.screenshot({ path: `${out}/page-contact-desktop.png` })
  await ctx.close()
}

// ── Phone ─────────────────────────────────────────────────────────────────────
{
  const { ctx, page } = await openPage({ width: 390, height: 844 }, true)
  const bar = page.locator('.cv-bar')
  assert.equal(await bar.isVisible(), true)
  assert.equal(await page.locator('.cv-menu').isVisible(), false)
  const box = await bar.boundingBox()
  assert.ok(box && box.y >= 0 && box.y + box.height <= 844 + 0.5 && box.x >= 0 && box.x + box.width <= 390 + 0.5)
  for (const sel of ['.cv-bar [data-cv="pdf"]', '.cv-bar [data-cv="word"]']) {
    const b = await page.locator(sel).boundingBox()
    assert.ok(
      b && b.x >= 0 && b.x + b.width <= 390 && b.y + b.height <= 844 && b.height >= 48,
      `${sel} inside viewport and >= 48px`,
    )
  }
  ok('phone: sticky CV bar inside the viewport, buttons >= 48px high')
  await page.locator('.cv-bar [data-cv="pdf"]').tap()
  assert.equal((await page.evaluate(() => window.__printCalls)).length, 1)
  ok('phone: bar PDF button -> one print call')
  if (out) await page.screenshot({ path: `${out}/page-top-phone-bar.png` })

  await page.evaluate(() => document.getElementById('contact').scrollIntoView({ behavior: 'instant' }))
  await page.waitForFunction(() => document.body.dataset.inContact === 'true')
  assert.equal(await bar.isVisible(), false)
  ok('phone: bar hidden while #contact is in view')
  const block = await page.locator('#contact .cv-block__buttons .btn').first().boundingBox()
  assert.ok(block && block.x >= 0 && block.x + block.width <= 390)
  if (out) await page.screenshot({ path: `${out}/page-contact-phone.png` })
  await ctx.close()
}

await browser.close()
console.log(`all ${step} checks passed`)
