/**
 * Pure parts of the budget check (plan section 5), so Vitest can test them without a build or a browser.
 * The CLI that reads dist/ and public/ and measures frames is check-budget.mjs.
 */
import { gzipSync } from 'node:zlib'

const KB = 1000

/** Plan section 5. Bytes, except `tris` and `calls`. Desktop is the `high` tier, phone the `low` tier. */
export const BUDGETS = {
  eagerJsGzip: 60 * KB,
  sceneJsGzip: 400 * KB,
  bloomGzip: 30 * KB,
  docxGzip: 200 * KB,
  poster: 120 * 1024,
  desktop: { first: 1500 * KB, detail: 800 * KB, tris: 100_000, calls: 120 },
  phone: { first: 800 * KB, detail: 400 * KB, tris: 60_000, calls: 70 },
}

export const gzipBytes = (input) => gzipSync(input, { level: 9 }).length

/**
 * Static import specifiers ("./Foo.js") of a built chunk. Dynamic `import("./x.js")` is left out on purpose: that is
 * how the lazy scene chunk is reached.
 */
export function parseStaticImports(code) {
  const found = new Set()
  const patterns = [
    /(?:^|[;}\s])(?:import|export)\s*[^"'();]*?from\s*["'](\.{1,2}\/[^"']+)["']/g,
    /(?:^|[;}\s])import\s*["'](\.{1,2}\/[^"']+)["']/g,
  ]
  for (const re of patterns) for (const m of code.matchAll(re)) found.add(m[1])
  return [...found]
}

/** `src` of every `<script type="module" src=...>` in the page, as bare file names. */
export function parseHtmlScripts(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/g)].map((m) => m[1].split('/').pop())
}

/** Module code of inline `<script type="module">` blocks (Astro inlines tiny entry scripts). */
export function parseInlineModules(html) {
  return [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  )
}

/**
 * Splits chunks into eager (reachable from the page through static imports) and lazy (everything else, reached through
 * dynamic import()). `files` maps a chunk file name to its source text.
 */
export function splitChunks(files, html) {
  const eager = new Set()
  const visit = (name) => {
    if (eager.has(name) || !files.has(name)) return
    eager.add(name)
    for (const spec of parseStaticImports(files.get(name))) visit(spec.split('/').pop())
  }
  for (const name of parseHtmlScripts(html)) visit(name)
  for (const code of parseInlineModules(html)) {
    for (const spec of parseStaticImports(code)) visit(spec.split('/').pop())
  }
  const lazy = [...files.keys()].filter((n) => !eager.has(n))
  return { eager: [...eager], lazy }
}

/** Lazy chunks by purpose: the bloom effect (high tier only), the Word export (on click) and the rest (the scene). */
export function classifyLazy(lazy) {
  const out = { scene: [], bloom: [], docx: [] }
  for (const name of lazy) {
    if (/^Bloom[.-]/.test(name)) out.bloom.push(name)
    else if (/^docx[.-]/.test(name)) out.docx.push(name)
    else out.scene.push(name)
  }
  return out
}

/** Base path the site was built for (`/` or `/immanuel-3d/`), read from the first `_astro/` URL in the page. */
export function baseFromHtml(html) {
  const m = html.match(/["'(]([^"'()\s]*?)_astro\//)
  return m ? m[1] || '/' : '/'
}

const isPhoneFile = (file) => /-phone\./.test(file)
// a file with a -phone twin is loaded as that twin on the phone tier; anything else is shared
const hasPhoneTwin = (file) => /-(diff|nor|arm)\.webp$/.test(file)

/** Bytes per manifest group for one variant, the way the runtime loads them. Extra files: `[{ group, file, bytes }]`. */
export function groupBytes(models, textures, variant, extra = []) {
  const out = {}
  const add = (group, n) => {
    out[group] = (out[group] ?? 0) + n
  }
  for (const m of models) add(m.group, m.bytes[variant])
  for (const t of textures) {
    const wanted = variant === 'phone' ? isPhoneFile(t.file) || !hasPhoneTwin(t.file) : !isPhoneFile(t.file)
    if (wanted) add(t.group, t.bytes)
  }
  for (const e of extra) {
    const phoneFile = isPhoneFile(e.file)
    if (
      variant === 'phone' ? phoneFile || !extra.some((x) => x.file === e.file.replace(/\./, '-phone.')) : !phoneFile
    ) {
      add(e.group, e.bytes)
    }
  }
  return out
}

export function groupTriangles(models, variant) {
  const out = {}
  for (const m of models) out[m.group] = (out[m.group] ?? 0) + m.triangles[variant] * m.instances
  return out
}

/** One report row: `{ name, value, limit, unit, ok }`. */
export const row = (name, value, limit, unit = 'bytes') => ({ name, value, limit, unit, ok: value <= limit })

export function fmt(r) {
  const show = (n) => (r.unit === 'bytes' ? `${(n / 1000).toFixed(1)} KB` : n.toLocaleString('en-US'))
  return `${r.ok ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(46)} ${show(r.value).padStart(12)} / ${show(r.limit)}`
}

/** Triangles of a draw: TRIANGLES (4) is count / 3, STRIP (5) and FAN (6) count - 2, anything else (lines, points) 0. */
export function trianglesOfDraw(mode, count, instances = 1) {
  if (mode === 4) return (count / 3) * instances
  if (mode === 5 || mode === 6) return Math.max(0, count - 2) * instances
  return 0
}

/**
 * Source of the init script that counts WebGL draw calls and triangles. It wraps the draw methods of both context
 * prototypes and exposes `window.__frameCost()`: resolves with `{ calls, tris }` of exactly one animation frame (it resets
 * on one rAF callback and reads on the next, so one render tick falls in between whatever the callback order).
 */
export function drawCounterScript() {
  return `(() => {
    const stats = { calls: 0, tris: 0 }
    const tri = ${trianglesOfDraw.toString()}
    for (const proto of [window.WebGL2RenderingContext?.prototype, window.WebGLRenderingContext?.prototype]) {
      if (!proto) continue
      const wrap = (name, countAt, instAt) => {
        const original = proto[name]
        if (!original) return
        proto[name] = function (...a) {
          stats.calls += 1
          stats.tris += tri(a[0], a[countAt], instAt === undefined ? 1 : a[instAt])
          return original.apply(this, a)
        }
      }
      wrap('drawArrays', 2)
      wrap('drawElements', 1)
      wrap('drawArraysInstanced', 2, 3)
      wrap('drawElementsInstanced', 1, 4)
      wrap('drawRangeElements', 3)
    }
    window.__frameCost = () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => {
          stats.calls = 0
          stats.tris = 0
          requestAnimationFrame(() => resolve({ calls: stats.calls, tris: Math.round(stats.tris) }))
        }),
      )
  })()`
}
