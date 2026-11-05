// Dev check of the reduced-motion still and the context-loss fallback against a running preview.
// node scripts/state-check.mjs [url]
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:4361/immanuel-3d/'
const swift = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
const settled = () =>
  ['ready', 'still', 'poster', 'lost'].includes(document.getElementById('scene')?.dataset.sceneState ?? '')

async function open(reducedMotion) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: swift })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !/THREE\.Clock/.test(m.text()) && errors.push(m.text()))
  await page.goto(url)
  await page.mouse.wheel(0, 100)
  await page.waitForFunction(settled, null, { timeout: 150000 })
  return { browser, page, errors }
}

const read = (page) => page.evaluate(() => document.getElementById('scene').dataset.sceneState)

{
  const { browser, page, errors } = await open('reduce')
  console.log('reduced motion ->', await read(page), '| console errors:', errors.length)
  // flip live: motion on -> ready
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(1500)
  console.log('  after enabling motion ->', await read(page))
  await browser.close()
}
{
  const { browser, page } = await open('no-preference')
  await page.evaluate(() => {
    const canvas = document.querySelector('#scene-canvas canvas')
    canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext()
  })
  await page.waitForTimeout(1500)
  const state = await read(page)
  const posterOpacity = await page.evaluate(() => getComputedStyle(document.querySelector('#scene-canvas')).opacity)
  console.log('context loss ->', state, '| canvas layer opacity:', posterOpacity)
  await browser.close()
}
