// Q1 QA suite. Run ONE project at a time with one worker (the swiftshader scene is heavy):
//   npm run build            (MSYS_NO_PATHCONV=1 BASE_PATH=/immanuel-3d/ in Git Bash)
//   npx playwright test -c e2e/q1/playwright.config.ts --project=no-webgl-1440
// Projects: <mode>-<width> for mode in webgl | no-webgl | reduced-motion | base-path, plus `static` (built-HTML checks).
import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.Q1_PORT ?? 4362)
export const BASE = '/immanuel-3d/'

const SWIFTSHADER = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
const NO_WEBGL = ['--disable-webgl', '--disable-3d-apis']

export const VIEWPORTS = [
  { width: 1440, height: 900, touch: false },
  { width: 1024, height: 768, touch: false },
  { width: 820, height: 1180, touch: true },
  { width: 390, height: 844, touch: true },
  { width: 360, height: 740, touch: true },
] as const

/** Tier pinned per size (`?tier=`): swiftshader would otherwise decline it within seconds and make runs non-comparable. */
const tierFor = (width: number) => (width >= 1024 ? 'high' : width >= 390 ? 'touch' : 'low')

const MODES = {
  webgl: { args: SWIFTSHADER, reducedMotion: 'no-preference' as const, match: /(scene|a11y|nav|layout)\.spec\.ts/ },
  'no-webgl': {
    args: NO_WEBGL,
    reducedMotion: 'no-preference' as const,
    match: /(scene|a11y|nav|layout|agentcard|keyboard)\.spec\.ts/,
  },
  'reduced-motion': {
    args: SWIFTSHADER,
    reducedMotion: 'reduce' as const,
    match: /(scene|a11y|nav|layout|agentcard|keyboard)\.spec\.ts/,
  },
  'base-path': { args: SWIFTSHADER, reducedMotion: 'no-preference' as const, match: /base-path\.spec\.ts/ },
}

const projects = Object.entries(MODES).flatMap(([mode, m]) =>
  VIEWPORTS.map((vp) => ({
    name: `${mode}-${vp.width}`,
    testMatch: m.match,
    metadata: { mode, tier: tierFor(vp.width), touch: vp.touch, width: vp.width },
    use: {
      channel: 'chrome',
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.touch,
      reducedMotion: m.reducedMotion,
      launchOptions: { args: m.args },
    },
  })),
)

export default defineConfig({
  testDir: '.',
  outputDir: '../../test-results/q1',
  timeout: 240_000, // software WebGL needs 33-51 s to `ready`; hooks use the same budget
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: `node e2e/q1/serve.mjs --port=${PORT} --base=${BASE}`,
    url: `http://127.0.0.1:${PORT}${BASE}`,
    reuseExistingServer: false,
    timeout: 30_000,
    cwd: '../..',
  },
  projects: [
    ...projects,
    { name: 'static', testMatch: /static\.spec\.ts/, use: { baseURL: `http://127.0.0.1:${PORT}` } },
  ],
})
