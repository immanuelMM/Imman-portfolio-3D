/**
 * Builds the project-screen atlas for the 3D scene from the user's own project art (src/assets/ai/*.svg, 800x300):
 * public/screens/atlas.webp (3 columns x 2 rows of 512x192 cells, desktop) and atlas-phone.webp (256x96 cells), plus
 * public/screens/manifest.json (cell order, bytes, licence). One atlas = one texture and one draw call for all six screens.
 * Cell order is the order of the AI project cards (src/data/projects.ts); screens.test.ts keeps the two in step.
 * Usage: node scripts/build-screens.mjs
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const art = path.join(here, '..', 'src', 'assets', 'ai')
const out = path.join(here, '..', 'public', 'screens')
await mkdir(out, { recursive: true })

const COLS = 3
const ROWS = 2
const CELLS = ['fullstack-agent', 'master-brd', 'ba-reviewer', 'n8n-workflow', 'agentic-coding', 'prompt-engineering']
const files = []

for (const [file, cellW, cellH, quality] of [
  ['atlas.webp', 512, 192, 80],
  ['atlas-phone.webp', 256, 96, 78],
]) {
  const composites = []
  for (const [i, name] of CELLS.entries()) {
    const svg = await readFile(path.join(art, `${name}.svg`))
    const input = await sharp(svg, { density: 96 * (cellW / 800) * 2 })
      .resize(cellW, cellH, { fit: 'fill' })
      .png()
      .toBuffer()
    composites.push({ input, left: (i % COLS) * cellW, top: Math.floor(i / COLS) * cellH })
  }
  const atlas = sharp({
    create: { width: COLS * cellW, height: ROWS * cellH, channels: 3, background: '#05080c' },
  }).composite(composites)
  await writeFile(path.join(out, file), await atlas.webp({ quality, effort: 6 }).toBuffer())
  const bytes = (await stat(path.join(out, file))).size
  files.push({ file: `screens/${file}`, bytes })
  console.log(file.padEnd(20), Math.round(bytes / 1024), 'KB')
}

await writeFile(
  path.join(out, 'manifest.json'),
  JSON.stringify(
    {
      cols: COLS,
      rows: ROWS,
      cells: CELLS,
      licence: 'owned',
      source: 'src/assets/ai (the author’s own project art, from AI_Porfolio)',
      group: 'detail-web',
      files,
    },
    null,
    2,
  ) + '\n',
)
