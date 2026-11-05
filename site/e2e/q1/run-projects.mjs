// Runs the Q1 Playwright projects ONE AT A TIME (one worker each) and prints a pass/fail table.
//   node e2e/q1/run-projects.mjs [mode ...]        modes: static no-webgl reduced-motion webgl base-path (default: all)
// Build first: MSYS_NO_PATHCONV=1 BASE_PATH=/immanuel-3d/ npm run build
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const WIDTHS = [1440, 1024, 820, 390, 360]
const MODES = ['static', 'no-webgl', 'reduced-motion', 'base-path', 'webgl']
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : MODES
const projects = wanted.flatMap((m) => (m === 'static' ? ['static'] : WIDTHS.map((w) => `${m}-${w}`)))

const rows = []
for (const project of projects) {
  const t0 = Date.now()
  const r = spawnSync(
    'npx',
    ['playwright', 'test', '-c', 'e2e/q1/playwright.config.ts', `--project=${project}`, '--reporter=json'],
    { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 256 * 1024 * 1024 },
  )
  mkdirSync('test-results/q1-json', { recursive: true })
  writeFileSync(`test-results/q1-json/${project}.json`, r.stdout ?? '')
  let counts = { expected: 0, unexpected: 0, skipped: 0, flaky: 0 }
  try {
    counts = { ...counts, ...JSON.parse(r.stdout).stats }
  } catch {
    console.log(`${project}: no JSON result (exit ${r.status})\n${(r.stderr || r.stdout).slice(-600)}`)
  }
  rows.push({ project, passed: counts.expected, failed: counts.unexpected, flaky: counts.flaky, skipped: counts.skipped, secs: Math.round((Date.now() - t0) / 1000) })
  console.log(JSON.stringify(rows.at(-1)))
}
console.table(rows)
process.exitCode = rows.some((r) => r.failed > 0) ? 1 : 0
