// Dev check for the scene gate against a running preview: node scripts/gate-check.mjs [url]
// Prints the scene state (webgl + scroll, and --disable-webgl) and the scene chunk requests.
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:4361/immanuel-3d/'
const swift = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']

async function run(label, args) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const chunks = []
  const errors = []
  page.on('request', (r) => /SceneRoot/.test(r.url()) && chunks.push(r.url()))
  page.on('console', (m) => m.type() === 'error' && !/THREE\.Clock/.test(m.text()) && errors.push(m.text()))
  await page.goto(url)
  await page.mouse.wheel(0, 200)
  await page.waitForFunction(
    () => ['ready', 'still', 'poster', 'lost'].includes(document.getElementById('scene')?.dataset.sceneState ?? ''),
    null,
    { timeout: 30000 },
  )
  const state = await page.evaluate(() => document.getElementById('scene').dataset.sceneState)
  console.log(label, '->', state, '| scene chunk requests:', chunks.length, '| console errors:', errors.length)
  errors.forEach((e) => console.log('   ', e))
  await browser.close()
}

await run('swiftshader', swift)
await run('no-webgl', ['--disable-webgl', '--disable-3d-apis'])
