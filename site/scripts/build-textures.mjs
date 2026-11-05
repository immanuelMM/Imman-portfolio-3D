/**
 * Builds the tiling room materials (Poly Haven CC0 1k jpg maps in assets-raw/polyhaven/<id>/) into WebP files in
 * public/textures: `<name>-<map>.webp` (desktop) and `<name>-<map>-phone.webp`, plus public/textures/manifest.json
 * (bytes per file, licence, source) which the budget tests and the credits read.
 * The raw scans are rusty and saturated: a control room is clean and cold, so each material is desaturated and tinted
 * blue-grey and darkened at build time.
 * Usage: node scripts/build-textures.mjs
 */
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const raw = path.join(here, '..', '..', 'assets-raw', 'polyhaven')
const out = path.join(here, '..', 'public', 'textures')
await mkdir(out, { recursive: true })

/** name, Poly Haven id, author, desktop px, phone px, saturation, per-channel tint (also the brightness) */
const materials = [
  ['floor', 'metal_plate_02', 'Rob Tuytel', 1024, 512, 0.12, [0.62, 0.7, 0.82]],
  ['wall', 'factory_wall', 'Rob Tuytel', 512, 256, 0.1, [0.5, 0.58, 0.7]],
  ['plate', 'metal_plate', 'Rob Tuytel', 512, 256, 0.1, [0.55, 0.62, 0.74]],
]
const TITLES = { metal_plate_02: 'Metal Plate 02', factory_wall: 'Factory Wall', metal_plate: 'Metal Plate' }
/** map, Poly Haven tag, quality, size divisor (normal and ORM maps one step below the base colour) */
const maps = [
  ['diff', 'diff', 76, 1],
  ['nor', 'nor_gl', 78, 2],
  ['arm', 'arm', 72, 2],
]

const files = []
async function write(img, file, quality, meta) {
  const dest = path.join(out, file)
  const buf = await img.webp({ quality, effort: 6 }).toBuffer()
  const { writeFile: wf } = await import('node:fs/promises')
  await wf(dest, buf)
  const bytes = (await stat(dest)).size
  files.push({ file: `textures/${file}`, bytes, group: 'room-first', ...meta })
  console.log(file.padEnd(28), Math.round(bytes / 1024), 'KB')
}

for (const [name, id, author, desktop, phone, saturation, tint] of materials) {
  for (const [map, tag, quality, div] of maps) {
    const src = path.join(raw, id, `${id}_${tag}_1k.jpg`)
    const meta = {
      name: `${name}-${map}`,
      licence: 'CC0-1.0',
      source: `https://polyhaven.com/a/${id}`,
      author,
      title: TITLES[id],
    }
    const tone = (img) => (map === 'diff' ? img.modulate({ saturation }).linear(tint, [0, 0, 0]) : img)
    await write(
      tone(sharp(src).resize(desktop / div, desktop / div, { fit: 'fill' })),
      `${name}-${map}.webp`,
      quality,
      meta,
    )
    await write(
      tone(sharp(src).resize(phone / div, phone / div, { fit: 'fill' })),
      `${name}-${map}-phone.webp`,
      quality,
      meta,
    )
  }
}

await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ textures: files }, null, 2) + '\n')
console.log(
  'textures, desktop KB:',
  Math.round(files.filter((f) => !/-phone/.test(f.file)).reduce((a, f) => a + f.bytes, 0) / 1024),
)
console.log(
  'textures, phone KB:  ',
  Math.round(files.filter((f) => /-phone/.test(f.file)).reduce((a, f) => a + f.bytes, 0) / 1024),
)
