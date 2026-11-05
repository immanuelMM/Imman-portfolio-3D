// Built-site checks that need no browser: banned strings in everything shipped (HTML, JS, CSS, JSON, XML, text),
// the base-path build bug (`Program Files`), sitemap/robots, absolute-URL hygiene.
import { expect, test } from '@playwright/test'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const DIST = resolve(import.meta.dirname, '../../dist')
const TEXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.xml', '.txt', '.svg', '.webmanifest', '.map'])

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

/** Literal strings and patterns that must never ship: street address, birth date, nationality line, the old admin password, a Windows path from the MSYS base-path bug. */
const BANNED: { name: string; re: RegExp }[] = [
  { name: 'street address (Highview)', re: /Highview/i },
  { name: 'street address (P2-B2)', re: /P2-B2/ },
  { name: 'birth date (Dec 24)', re: /Dec(ember)?\.? 24\b/ },
  { name: 'birth year 1991', re: /\b1991\b/ },
  { name: 'birth date label', re: /date of birth|birth ?date|birthday|\bDOB\b/i },
  { name: 'nationality line', re: /Filipino\s*[•·|]|nationality|citizenship/i },
  { name: 'Windows path (Program Files)', re: /Program Files/ },
  { name: 'Windows drive path', re: /(^|["'(=])\/?[A-Z]:[\\/](Users|Program|Windows)/ },
  { name: 'file:// URL', re: /file:\/\/\// },
  { name: 'uploaded raw portrait', re: /profile\.JPG/ },
]

test.describe('built HTML and assets', () => {
  test.beforeAll(() => {
    expect(existsSync(join(DIST, 'index.html')), 'run `npm run build` first').toBe(true)
  })

  test('none of the banned strings is shipped', () => {
    const files = walk(DIST).filter((f) => TEXT.has(extname(f)))
    expect(files.length).toBeGreaterThan(10)
    const hits: string[] = []
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      for (const b of BANNED) {
        const m = b.re.exec(text)
        if (m) hits.push(`${f.slice(DIST.length + 1)}: ${b.name} -> "${text.slice(Math.max(0, m.index - 20), m.index + 40).replace(/\s+/g, ' ')}"`)
      }
    }
    expect(hits).toEqual([])
  })

  test('the old admin password (AUTH) from the source CV site is not shipped', () => {
    // Read at run time from the sibling repo so the secret is never written into this repo; skipped where it does not exist (CI).
    const src = resolve(import.meta.dirname, '../../../../ori-portfolio/AI_Porfolio/app.js')
    test.skip(!existsSync(src), 'source portfolio is not checked out here')
    const m = /AUTH\s*=\s*\{[^}]*password:\s*'([^']+)'/.exec(readFileSync(src, 'utf8'))
    expect(m, 'AUTH password found in the source').not.toBeNull()
    const secret = m![1]
    const shipped = walk(DIST).filter((f) => TEXT.has(extname(f)) && readFileSync(f, 'utf8').includes(secret))
    expect(shipped).toEqual([])
    const html = readFileSync(join(DIST, 'index.html'), 'utf8')
    expect(html).not.toMatch(/AUTH\s*=/)
  })

  test('every root-absolute URL in the HTML carries the base path', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8')
    const bad = [...html.matchAll(/(?:href|src|content|srcset)="(\/[^"]*)"/g)]
      .map((m) => m[1])
      .filter((u) => !u.startsWith('/immanuel-3d/') && !u.startsWith('//'))
    expect(bad).toEqual([])
  })

  test('robots and sitemap point at the production base', () => {
    const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8')
    expect(robots).toMatch(/Sitemap: https:\/\/immanuelmm\.github\.io\/immanuel-3d\/sitemap-index\.xml/)
    const sm = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8')
    expect(sm).toContain('https://immanuelmm.github.io/immanuel-3d/')
  })
})
