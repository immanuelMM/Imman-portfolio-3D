// Temporary Open Graph image (1200x630) until S3 captures one from the real scene: node scripts/make-og-placeholder.mjs
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#5ee7ff" stop-opacity="0.22"/><stop offset="1" stop-color="#07090d" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="630" fill="#07090d"/><rect width="1200" height="630" fill="url(#g)"/>
<g fill="none" stroke="#26323f" stroke-width="2"><rect x="120" y="120" width="120" height="260" rx="8"/><rect x="270" y="100" width="120" height="280" rx="8"/><rect x="420" y="80" width="120" height="300" rx="8"/><rect x="570" y="100" width="120" height="280" rx="8"/><rect x="720" y="120" width="120" height="260" rx="8"/></g>
<text x="120" y="480" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#e6edf3">Immanuel Mahusay</text>
<text x="120" y="540" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#5ee7ff">Software Engineer · AI agent command center</text>
</svg>`

const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
await writeFile(new URL('../public/og.png', import.meta.url), buf)
console.log('og.png', buf.length, 'bytes')
