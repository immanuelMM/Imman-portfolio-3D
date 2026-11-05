/**
 * `npm run budget`: checks the built site (dist/) and the asset manifests (public/) against plan section 5, then renders the
 * built site in software WebGL and counts the draw calls and triangles of one frame in every chapter on the high tier
 * (1440x900) and the low tier (390x844 touch). Prints every number; exit code 1 when anything is over budget.
 *   npm run build && npm run budget            # everything (about 3 minutes: swiftshader needs ~35 s to the first frame)
 *   npm run budget -- --static                 # sizes only, no browser
 *   npm run budget -- --only=desktop           # one tier's frames (desktop | phone)
 * Run `npm run build` first (any BASE_PATH: the script serves dist/ under the base path it finds in the page).
 */
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BUDGETS,
  baseFromHtml,
  classifyLazy,
  drawCounterScript,
  fmt,
  groupBytes,
  groupTriangles,
  gzipBytes,
  row,
  splitChunks,
} from './budget-lib.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const pub = path.join(root, 'public')
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const staticOnly = process.argv.includes('--static')

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html not found: run `npm run build` first.')
  process.exit(1)
}

const rows = []
const section = (title) => rows.push({ title })
const detail = (text) => rows.push({ detail: text })

// JavaScript
const astroDir = path.join(dist, '_astro')
const files = new Map(
  readdirSync(astroDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => [f, readFileSync(path.join(astroDir, f), 'utf8')]),
)
const html = readFileSync(path.join(dist, 'index.html'), 'utf8')
const { eager, lazy } = splitChunks(files, html)
const groups = classifyLazy(lazy)
const gz = (names) => names.reduce((sum, n) => sum + gzipBytes(files.get(n)), 0)
section('JavaScript (gzip)')
rows.push(row(`eager JS (${eager.length} file${eager.length === 1 ? '' : 's'})`, gz(eager), BUDGETS.eagerJsGzip))
rows.push(row(`scene chunks (${groups.scene.length} files)`, gz(groups.scene), BUDGETS.sceneJsGzip))
for (const name of groups.scene) detail(`${name}: ${(gzipBytes(files.get(name)) / 1000).toFixed(1)} KB gzip`)
rows.push(row('bloom chunk (high tier only)', gz(groups.bloom), BUDGETS.bloomGzip))
rows.push(row('CV Word chunk (docx, on click)', gz(groups.docx), BUDGETS.docxGzip))

// 3D assets by manifest group
const models = readJson(path.join(pub, 'models', 'manifest.json')).models
const textures = readJson(path.join(pub, 'textures', 'manifest.json')).textures
const screens = readJson(path.join(pub, 'screens', 'manifest.json'))
const extra = screens.files.map((f) => ({ group: screens.group, file: f.file, bytes: f.bytes }))
for (const [variant, tier] of [
  ['desktop', 'high'],
  ['phone', 'low'],
]) {
  const budget = BUDGETS[variant]
  const bytes = groupBytes(models, textures, variant, extra)
  section(`3D assets, ${variant} (${tier} tier)`)
  rows.push(row('first frame (models + textures)', bytes['room-first'] ?? 0, budget.first))
  rows.push(row('detail groups (#web screens, #education)', bytes['detail-web'] ?? 0, budget.detail))
  const tris = groupTriangles(models, variant)
  detail(`prop triangles (instances counted): ${tris['room-first'] ?? 0} (the room itself is built in code)`)
}

// Posters
section('Posters (each <= 120 KB)')
const posterDir = path.join(pub, 'poster')
for (const f of existsSync(posterDir) ? readdirSync(posterDir).sort() : []) {
  rows.push(row(`poster/${f}`, statSync(path.join(posterDir, f)).size, BUDGETS.poster))
}
if (!existsSync(posterDir)) rows.push(row('poster/ folder exists', 0, -1))

// Frame cost in the browser
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
}

function serveDist(base) {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    if (!url.startsWith(base)) {
      res.writeHead(404).end()
      return
    }
    let file = path.join(dist, url.slice(base.length))
    if (!file.startsWith(dist)) {
      res.writeHead(403).end()
      return
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!existsSync(file)) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

const CHAPTERS = ['about', 'experience', 'ai', 'web', 'education', 'contact']
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
const CONFIGS = [
  { name: 'desktop', tier: 'high', viewport: { width: 1440, height: 900 }, touch: false, limits: BUDGETS.desktop },
  { name: 'phone', tier: 'low', viewport: { width: 390, height: 844 }, touch: true, limits: BUDGETS.phone },
].filter((c) => !only || c.name === only)

async function measureFrames(url) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
  })
  const out = []
  try {
    for (const cfg of CONFIGS) {
      const ctx = await browser.newContext({
        viewport: cfg.viewport,
        hasTouch: cfg.touch,
        isMobile: cfg.touch,
        deviceScaleFactor: 1,
      })
      await ctx.addInitScript(drawCounterScript())
      const page = await ctx.newPage()
      // the tier is pinned so the frame-rate monitor can never step the look down mid-measurement
      await page.goto(`${url}?tier=${cfg.tier}`)
      await page.mouse.move(cfg.viewport.width / 2, cfg.viewport.height / 2)
      await page.mouse.wheel(0, 1)
      await page.waitForFunction(
        () => ['ready', 'still', 'poster', 'lost'].includes(document.getElementById('scene')?.dataset.sceneState ?? ''),
        null,
        { timeout: 240000 },
      )
      const state = await page.evaluate(() => document.getElementById('scene').dataset.sceneState)
      if (state !== 'ready') throw new Error(`${cfg.name}: scene state ${state}, expected ready`)
      await page.waitForTimeout(2500)
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
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(1500) // lazy detail groups mount on the frame after their chapter starts
        const tier = await page.evaluate(() => document.getElementById('scene').dataset.tier)
        const a = await page.evaluate(() => window.__frameCost())
        const b = await page.evaluate(() => window.__frameCost())
        out.push({ cfg, id, tier, calls: Math.max(a.calls, b.calls), tris: Math.max(a.tris, b.tris) })
      }
      await ctx.close()
    }
  } finally {
    await browser.close()
  }
  return out
}

if (!staticOnly) {
  const base = baseFromHtml(html)
  const server = await serveDist(base)
  try {
    const url = `http://127.0.0.1:${server.address().port}${base}`
    console.log(`measuring frames at ${url} (software WebGL, one frame per chapter) ...`)
    const samples = await measureFrames(url)
    for (const cfg of CONFIGS) {
      section(`one frame per chapter, ${cfg.name} (${cfg.tier} tier, ${cfg.viewport.width}x${cfg.viewport.height})`)
      for (const s of samples.filter((x) => x.cfg === cfg)) {
        // the tier can drop mid-run (PerformanceMonitor on a slow machine): then the numbers are not this tier's
        if (s.tier !== cfg.tier) rows.push(row(`${s.id}: tier is ${s.tier}, expected ${cfg.tier}`, 1, 0, 'tier'))
        rows.push(row(`draw calls, ${s.id}`, s.calls, cfg.limits.calls, 'calls'))
        rows.push(row(`triangles, ${s.id}`, s.tris, cfg.limits.tris, 'tris'))
      }
    }
  } finally {
    server.close()
  }
}

let failed = 0
for (const r of rows) {
  if (r.title) console.log(`\n${r.title}`)
  else if (r.detail) console.log(`      ${r.detail}`)
  else {
    console.log(fmt(r))
    if (!r.ok) failed += 1
  }
}
console.log(failed === 0 ? '\nAll budgets hold.' : `\n${failed} budget(s) exceeded.`)
process.exit(failed === 0 ? 0 : 1)
