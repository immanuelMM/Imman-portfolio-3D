// Hover-state screenshots with the 3D room (swiftshader, high tier pinned) against a running preview:
//   node scripts/hover-shots.mjs <outDir> [url]
// hover-agent.png: the QA item hovered, its panel lit. hover-project.png: the first AI project card hovered, its screen lit.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const outDir = process.argv[2]
const url = process.argv[3] ?? 'http://localhost:4361/immanuel-3d/'
await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${url}?tier=high`)
await page.mouse.wheel(0, 1)
await page.waitForFunction(() => document.getElementById('scene')?.dataset.sceneState === 'ready', null, {
  timeout: 240000,
})
await page.waitForTimeout(2500)

async function settle() {
  await page
    .waitForFunction(() => document.getElementById('scene').dataset.camera === 'moving', null, { timeout: 4000 })
    .catch(() => {})
  await page.waitForFunction(() => document.getElementById('scene').dataset.camera === 'settled', null, {
    timeout: 120000,
  })
  await page.waitForTimeout(2500)
}

await page.evaluate(() => {
  const el = document.getElementById('ai')
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5 + 2,
    behavior: 'instant',
  })
})
await settle()
await page.locator('.agent[data-agent="qa"]').hover()
await page.waitForFunction(() => document.getElementById('scene').dataset.highlight === 'agent:qa')
await page.waitForTimeout(3500)
await page.screenshot({ path: `${outDir}/hover-agent.png` })
console.log('hover-agent')

// scroll the first project card to mid-screen (the AI chapter camera stays), then hover it
await page.mouse.move(5, 5)
await page.evaluate(() => {
  const card = document.querySelector('#ai .project[data-hl^="screen:"]')
  window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 200, behavior: 'instant' })
})
await settle()
await page
  .locator('#ai .project[data-hl^="screen:"]')
  .first()
  .hover({ position: { x: 200, y: 60 } })
await page.waitForFunction(() => document.getElementById('scene').dataset.highlight?.startsWith('screen:'))
await page.waitForTimeout(3500)
await page.screenshot({ path: `${outDir}/hover-project.png` })
console.log('hover-project', await page.evaluate(() => document.getElementById('scene').dataset.highlight))
await browser.close()
