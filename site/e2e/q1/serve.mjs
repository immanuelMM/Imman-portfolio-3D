// Static server for the built site, used by the Q1 Playwright config (webServer) and the Lighthouse / link scripts.
//   node e2e/q1/serve.mjs [--port=4362] [--base=/immanuel-3d/] [--dir=dist]
// Serves dist/ ONLY under the base path, like GitHub Pages does: any URL outside it answers 404, so a root-absolute
// asset URL that forgot withBase() shows up as a 404 in the base-path project.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const port = Number(arg('port', process.env.Q1_PORT ?? '4362'))
const base = arg('base', process.env.Q1_BASE ?? '/immanuel-3d/')
const root = resolve(arg('dir', 'dist'))

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://x')
    let path = decodeURIComponent(url.pathname)
    if (!path.startsWith(base)) {
      res.writeHead(404).end('outside base path')
      return
    }
    path = path.slice(base.length)
    let file = normalize(join(root, path))
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end()
      return
    }
    let info = await stat(file).catch(() => null)
    if (info?.isDirectory()) {
      file = join(file, 'index.html')
      info = await stat(file).catch(() => null)
    }
    if (!info) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found')
      return
    }
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': 'no-store',
    })
    createReadStream(file).pipe(res)
  } catch {
    res.writeHead(500).end()
  }
})
server.listen(port, '127.0.0.1', () => console.log(`serving ${root} at http://127.0.0.1:${port}${base}`))
