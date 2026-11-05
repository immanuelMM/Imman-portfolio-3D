import { CanvasTexture, SRGBColorSpace } from 'three'
import { certifications } from '../data/certifications'
import { education } from '../data/education'

const CYAN = '#5ee7ff'
const AMBER = '#ffb547'
const DISPLAY = '"Space Grotesk Variable", "Space Grotesk Fallback", "Segoe UI", system-ui, sans-serif'
const SANS = '"Inter Variable", "Inter Fallback", system-ui, sans-serif'
const MONO = '"JetBrains Mono Variable", ui-monospace, Consolas, monospace'

export const ARCHIVE_CANVAS = { w: 800, h: 500 } as const

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 4 && ctx.measureText(`${t}...`).width > maxWidth) t = t.slice(0, -1)
  return `${t}...`
}

/** The wall "archive" display of the education chapter: education and certifications from the site data (decorative; the HTML has the full text). */
export function createArchiveTexture(): CanvasTexture {
  const { w, h } = ARCHIVE_CANVAS
  const el = document.createElement('canvas')
  el.width = w
  el.height = h
  const ctx = el.getContext('2d')!
  const body = ctx.createLinearGradient(0, 0, 0, h)
  body.addColorStop(0, 'rgba(20,70,90,0.55)')
  body.addColorStop(1, 'rgba(10,45,60,0.5)')
  ctx.fillStyle = body
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(94,231,255,0.4)'
  ctx.lineWidth = 2
  ctx.strokeRect(12, 12, w - 24, h - 24)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = CYAN
  ctx.font = `500 22px ${MONO}`
  ctx.fillText('ARCHIVE / EDUCATION', 40, 56)
  ctx.fillStyle = AMBER
  ctx.beginPath()
  ctx.arc(w - 50, 48, 7, 0, Math.PI * 2)
  ctx.fill()

  let y = 112
  for (const e of education) {
    ctx.fillStyle = '#e8fbff'
    ctx.font = `600 26px ${DISPLAY}`
    ctx.fillText(fit(ctx, e.role, w - 80), 40, y)
    ctx.fillStyle = 'rgba(94,231,255,0.85)'
    ctx.font = `400 20px ${MONO}`
    ctx.fillText(fit(ctx, `${e.org}  ·  ${e.period}`, w - 80), 40, y + 30)
    y += 78
  }
  ctx.strokeStyle = 'rgba(94,231,255,0.3)'
  ctx.beginPath()
  ctx.moveTo(40, y - 30)
  ctx.lineTo(w - 40, y - 30)
  ctx.stroke()
  ctx.fillStyle = CYAN
  ctx.font = `500 18px ${MONO}`
  ctx.fillText('CERTIFICATIONS', 40, y)
  ctx.fillStyle = 'rgba(214,240,248,0.92)'
  ctx.font = `400 21px ${SANS}`
  certifications
    .slice(0, 3)
    .forEach((c, i) => ctx.fillText(fit(ctx, `${c.name}  ${c.year}`, w - 80), 40, y + 34 + i * 32))

  const t = new CanvasTexture(el)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}
