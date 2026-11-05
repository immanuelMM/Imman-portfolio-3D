/**
 * Downloads Poly Haven (CC0) assets into assets-raw/polyhaven/<id>/ (git-ignored, untrusted, never executed).
 * Usage: node scripts/fetch-polyhaven.mjs model:<id> texture:<id> hdri:<id> ...
 *   model:   glTF at 1k (gltf + bin + textures), kept in the asset's own folder
 *   texture: 1k jpg maps Diffuse, nor_gl, arm (AO/rough/metal packed)
 *   hdri:    1k .hdr
 * The API needs a unique User-Agent. Every file's MD5 is verified; assets-raw/lock.json records id, url, md5, date.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const UA = 'immanuel-3d-build/1.0 (personal portfolio; contact via github.com/immanuelMM)'
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets-raw')
const lockPath = path.join(root, 'lock.json')

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

async function download(entry, dest, lock, id) {
  const res = await fetch(entry.url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${entry.url} -> ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const md5 = createHash('md5').update(buf).digest('hex')
  if (md5 !== entry.md5) throw new Error(`MD5 mismatch for ${entry.url}: ${md5} != ${entry.md5}`)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, buf)
  lock.push({ id, url: entry.url, md5, licence: 'CC0-1.0', date: new Date().toISOString().slice(0, 10) })
  console.log('ok', path.relative(root, dest), Math.round(buf.length / 1024), 'KB')
}

const lock = JSON.parse(await readFile(lockPath, 'utf8').catch(() => '[]'))
for (const spec of process.argv.slice(2)) {
  const [kind, id] = spec.split(':')
  const files = await getJson(`https://api.polyhaven.com/files/${id}`)
  const dir = path.join(root, 'polyhaven', id)
  if (kind === 'model') {
    const g = files.gltf['1k'].gltf
    await download(g, path.join(dir, `${id}.gltf`), lock, id)
    for (const [rel, entry] of Object.entries(g.include)) await download(entry, path.join(dir, rel), lock, id)
  } else if (kind === 'texture') {
    for (const map of ['Diffuse', 'nor_gl', 'arm']) {
      const entry = files[map]['1k'].jpg
      await download(entry, path.join(dir, path.basename(entry.url)), lock, id)
    }
  } else if (kind === 'hdri') {
    const entry = files.hdri['1k'].hdr
    await download(entry, path.join(dir, path.basename(entry.url)), lock, id)
  } else throw new Error(`unknown kind ${kind}`)
}
await writeFile(lockPath, JSON.stringify(lock, null, 2))
