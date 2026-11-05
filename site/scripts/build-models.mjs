/**
 * Optimises the raw Poly Haven glTF downloads (assets-raw/polyhaven/<id>/) into site/public/models/{desktop,phone}/<name>.glb
 * and writes public/models/manifest.json (bytes, triangles, licence, source) which the budget tests and credits read.
 * Pipeline per prop and variant: dedup, weld, simplify (meshoptimizer), WebP textures at a per-role size, prune, meshopt.
 * Usage: node scripts/build-models.mjs [name...]   (no names = every prop in src/data/props.json)
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { dedup, prune, simplify, weld, quantize, getBounds } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier, MeshoptDecoder } from 'meshoptimizer'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const site = path.join(here, '..')
const raw = path.join(site, '..', 'assets-raw', 'polyhaven')
const outRoot = path.join(site, 'public', 'models')
const props = JSON.parse(await readFile(path.join(site, 'src', 'data', 'props.json'), 'utf8'))

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready, MeshoptDecoder.ready])
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

/** Triangles actually drawn: mesh triangles counted once per node that uses the mesh. */
function drawnTriangles(doc) {
  const per = new Map()
  for (const mesh of doc.getRoot().listMeshes()) {
    let n = 0
    for (const prim of mesh.listPrimitives())
      n += (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3
    per.set(mesh, n)
  }
  let total = 0
  for (const node of doc.getRoot().listNodes()) if (node.getMesh()) total += per.get(node.getMesh())
  return Math.round(total)
}

async function build(prop, variant) {
  const doc = await io.read(path.join(raw, prop.source, `${prop.source}.gltf`))
  const root = doc.getRoot()
  const before = drawnTriangles(doc)
  const phone = variant === 'phone'
  const target = phone ? prop.trianglesPhone : prop.triangles
  await doc.transform(dedup(), weld({ tolerance: 0.0001 }))
  if (before > target) {
    // simplify per mesh in proportion; the ratio is of triangles, error caps visible damage
    await doc.transform(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: Math.max(0.02, target / before),
        error: prop.error ?? 0.05,
        lockBorder: false,
      }),
    )
  }
  // Textures -> WebP at the role size (phone one step down). Normal and ORM maps one step below the base colour.
  const size = phone ? prop.texturePhone : prop.texture
  for (const tex of root.listTextures()) {
    const name = tex.getURI() || tex.getName()
    const isBase = /diff/.test(name)
    const isEmissive = /emissive/.test(name)
    const px = isBase || isEmissive ? size : Math.max(128, size / 2)
    let image = Buffer.from(tex.getImage())
    // Brand names and labels printed on the scan are blurred into illegibility (CC0 covers the model, not trademarks).
    const rects = Object.entries(prop.redact ?? {}).find(([key]) => name.includes(key))?.[1]
    if (rects) {
      for (const [left, top, width, height] of rects) {
        const patch = await sharp(image).extract({ left, top, width, height }).blur(9).toBuffer()
        image = await sharp(image)
          .composite([{ input: patch, left, top }])
          .toBuffer()
      }
    }
    const quality = isBase ? 80 : /nor/.test(name) ? 82 : 78
    // some scans are very saturated (a red lamp): a per-prop saturation keeps them believable in a dim room
    if (isBase && prop.saturation) image = await sharp(image).modulate({ saturation: prop.saturation }).toBuffer()
    const out = await sharp(image)
      .resize(px, px, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toBuffer()
    tex
      .setImage(new Uint8Array(out))
      .setMimeType('image/webp')
      .setURI(name.replace(/\.\w+$/, '.webp'))
  }
  await doc.transform(prune(), quantize({ quantizePosition: 14, quantizeTexcoord: 12, quantizeNormal: 10 }))
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
  const dir = path.join(outRoot, variant)
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, `${prop.name}.glb`)
  await io.write(file, doc)
  const bounds = getBounds(root.listScenes()[0])
  return { bytes: (await stat(file)).size, triangles: drawnTriangles(doc), bounds }
}

const only = new Set(process.argv.slice(2))
const manifestPath = path.join(outRoot, 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{"models":[]}'))
for (const prop of props) {
  if (only.size && !only.has(prop.name)) continue
  const desktop = await build(prop, 'desktop')
  const phone = await build(prop, 'phone')
  const entry = {
    name: prop.name,
    group: prop.group,
    instances: prop.instances,
    file: `models/{variant}/${prop.name}.glb`,
    bytes: { desktop: desktop.bytes, phone: phone.bytes },
    triangles: { desktop: desktop.triangles, phone: phone.triangles },
    bounds: { min: desktop.bounds.min.map((v) => +v.toFixed(3)), max: desktop.bounds.max.map((v) => +v.toFixed(3)) },
    licence: 'CC0-1.0',
    source: `https://polyhaven.com/a/${prop.source}`,
    author: prop.author,
    title: prop.title,
  }
  const i = manifest.models.findIndex((m) => m.name === prop.name)
  if (i >= 0) manifest.models[i] = entry
  else manifest.models.push(entry)
  console.log(
    prop.name.padEnd(14),
    'desktop',
    Math.round(desktop.bytes / 1024),
    'KB',
    desktop.triangles,
    'tris | phone',
    Math.round(phone.bytes / 1024),
    'KB',
    phone.triangles,
    'tris',
  )
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
