// External links report (NON-BLOCKING: always exits 0). Reads the built HTML, requests every external http(s) URL and
// prints the status. Render free services sleep (~1 min wake) and the n8n link is a login page, so a timeout or 401/403
// is reported, not failed.
//   node e2e/q1/links-report.mjs
import { readFile } from 'node:fs/promises'

const html = await readFile('dist/index.html', 'utf8')
const urls = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')))]
  .filter((u) => !/immanuelmm\.github\.io\/immanuel-3d/.test(u))
console.log(`${urls.length} external links in dist/index.html`)

async function check(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 75_000) // a sleeping Render service needs ~60 s
  const t0 = Date.now()
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 immanuel-3d-qa-links-report' } })
    return { url, status: res.status, secs: Math.round((Date.now() - t0) / 1000), final: res.url === url ? '' : res.url }
  } catch (e) {
    return { url, status: e.name === 'AbortError' ? 'timeout' : `error ${e.cause?.code ?? e.message}`, secs: Math.round((Date.now() - t0) / 1000), final: '' }
  } finally {
    clearTimeout(timer)
  }
}

const rows = await Promise.all(urls.map(check))
for (const r of rows.sort((a, b) => String(a.status).localeCompare(String(b.status)))) {
  const flag = typeof r.status === 'number' && r.status < 400 ? 'ok  ' : 'WARN'
  console.log(`${flag} ${r.status}\t${r.secs}s\t${r.url}${r.final ? ` -> ${r.final}` : ''}`)
}
const warn = rows.filter((r) => !(typeof r.status === 'number' && r.status < 400))
console.log(`${rows.length - warn.length} ok, ${warn.length} to look at (non-blocking)`)
