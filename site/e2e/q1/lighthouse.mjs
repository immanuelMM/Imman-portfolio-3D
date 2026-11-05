// Lighthouse (mobile + desktop) on the BUILT site, served under its base path, with software WebGL so the scene runs.
//   node e2e/q1/lighthouse.mjs [--port=4363] [--runs=1] [--min=90]
// Build first: MSYS_NO_PATHCONV=1 BASE_PATH=/immanuel-3d/ npm run build
// Prints the four category scores per form factor and, for any score under --min, the failing audits that cost the most.
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const port = Number(arg('port', '4363'))
const runs = Number(arg('runs', '1'))
const min = Number(arg('min', '90'))
const url = `http://127.0.0.1:${port}/immanuel-3d/`
const outDir = 'test-results/lighthouse'
await mkdir(outDir, { recursive: true })

const server = spawn(process.execPath, ['e2e/q1/serve.mjs', `--port=${port}`], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1500))

const chromeFlags = [
  '--headless=new',
  '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader',
  '--ignore-gpu-blocklist',
  '--no-sandbox',
]
const CATS = ['performance', 'accessibility', 'best-practices', 'seo']
const results = []
try {
  for (const form of ['mobile', 'desktop']) {
    for (let i = 0; i < runs; i++) {
      const chrome = await launch({ chromeFlags })
      try {
        const flags = { port: chrome.port, output: 'json', onlyCategories: CATS, logLevel: 'error' }
        const run = await lighthouse(url, flags, form === 'desktop' ? desktopConfig : undefined)
        const lhr = run.lhr
        const scores = Object.fromEntries(CATS.map((c) => [c, Math.round((lhr.categories[c].score ?? 0) * 100)]))
        await writeFile(`${outDir}/${form}-${i + 1}.json`, JSON.stringify(lhr))
        const m = lhr.audits
        const metrics = {
          FCP: m['first-contentful-paint'].displayValue,
          LCP: m['largest-contentful-paint'].displayValue,
          TBT: m['total-blocking-time'].displayValue,
          CLS: m['cumulative-layout-shift'].displayValue,
          SI: m['speed-index'].displayValue,
        }
        const failing = Object.values(lhr.audits)
          .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable')
          .map((a) => `${a.id} (${a.score}) ${a.displayValue ?? ''}`)
        results.push({ form, run: i + 1, scores, metrics, failing })
        console.log(JSON.stringify({ form, run: i + 1, scores, metrics }))
        if (Object.values(scores).some((s) => s < min)) console.log(`  audits under 0.9 (${form}):\n   - ${failing.join('\n   - ')}`)
      } finally {
        await chrome.kill()
      }
    }
  }
} finally {
  server.kill()
}
const bad = results.filter((r) => Object.values(r.scores).some((s) => s < min))
console.log(bad.length ? `UNDER ${min}: ${bad.map((b) => b.form).join(', ')}` : `all categories >= ${min}`)
process.exitCode = bad.length ? 1 : 0
