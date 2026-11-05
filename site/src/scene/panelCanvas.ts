import type { Agent } from '../data/types'

/** Canvas size of one agent panel (the glass is 1.0 x 1.9 m). */
export const PANEL_CANVAS = { w: 512, h: 972 } as const

const CYAN = '#5ee7ff'
const AMBER = '#ffb547'
const DISPLAY = '"Space Grotesk Variable", "Space Grotesk Fallback", "Segoe UI", system-ui, sans-serif'
const SANS = '"Inter Variable", "Inter Fallback", system-ui, sans-serif'
const MONO = '"JetBrains Mono Variable", ui-monospace, Consolas, monospace'

/** Short mono status lines per agent: decoration for the panel, not site content. */
const STATUS: Record<string, string[]> = {
  lead: ['dispatch   6 agents', 'verify     build ok', 'review     queued'],
  planner: ['research   done', 'plan       milestone 2', 'handoff    ready'],
  backend: ['api        /v1 stable', 'openapi    snapshot', 'tests      passing'],
  frontend: ['types      generated', 'build      ok', 'a11y       checked'],
  qa: ['unit       green', 'e2e        5 viewports', 'axe        0 serious'],
  docs: ['readme     updated', 'adr        recorded', 'verified   behaviour'],
  devops: ['image      built', 'ci         running', 'deploy     staged'],
}

/** Draws one agent's glyph inside a 100x100 box at the origin (stroked, so bloom catches the lines). */
function drawGlyph(ctx: CanvasRenderingContext2D, id: string) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const circle = (x: number, y: number, r: number) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  switch (id) {
    case 'lead': {
      circle(50, 50, 13)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2
        const x = 50 + Math.cos(a) * 38
        const y = 50 + Math.sin(a) * 38
        ctx.beginPath()
        ctx.moveTo(50 + Math.cos(a) * 13, 50 + Math.sin(a) * 13)
        ctx.lineTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7)
        ctx.stroke()
        circle(x, y, 7)
      }
      break
    }
    case 'planner': {
      ctx.strokeRect(20, 12, 60, 76)
      for (let i = 0; i < 3; i++) {
        const y = 32 + i * 20
        ctx.beginPath()
        ctx.moveTo(30, y)
        ctx.lineTo(35, y + 5)
        ctx.lineTo(44, y - 5)
        ctx.moveTo(52, y)
        ctx.lineTo(70, y)
        ctx.stroke()
      }
      break
    }
    case 'backend': {
      for (let i = 0; i < 3; i++) {
        const y = 26 + i * 24
        ctx.beginPath()
        ctx.ellipse(50, y, 32, 10, 0, 0, Math.PI * 2)
        ctx.stroke()
        if (i < 2) {
          ctx.beginPath()
          ctx.moveTo(18, y)
          ctx.lineTo(18, y + 24)
          ctx.moveTo(82, y)
          ctx.lineTo(82, y + 24)
          ctx.stroke()
        }
      }
      break
    }
    case 'frontend': {
      ctx.strokeRect(10, 16, 80, 68)
      ctx.beginPath()
      ctx.moveTo(10, 32)
      ctx.lineTo(90, 32)
      ctx.stroke()
      circle(20, 24, 2)
      circle(28, 24, 2)
      circle(36, 24, 2)
      ctx.beginPath()
      ctx.moveTo(40, 48)
      ctx.lineTo(28, 58)
      ctx.lineTo(40, 68)
      ctx.moveTo(60, 48)
      ctx.lineTo(72, 58)
      ctx.lineTo(60, 68)
      ctx.moveTo(54, 44)
      ctx.lineTo(46, 72)
      ctx.stroke()
      break
    }
    case 'qa': {
      ctx.beginPath()
      ctx.moveTo(50, 8)
      ctx.lineTo(84, 22)
      ctx.lineTo(84, 50)
      ctx.quadraticCurveTo(84, 78, 50, 92)
      ctx.quadraticCurveTo(16, 78, 16, 50)
      ctx.lineTo(16, 22)
      ctx.closePath()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(34, 50)
      ctx.lineTo(46, 63)
      ctx.lineTo(68, 38)
      ctx.stroke()
      break
    }
    case 'docs': {
      ctx.beginPath()
      ctx.moveTo(24, 8)
      ctx.lineTo(62, 8)
      ctx.lineTo(80, 26)
      ctx.lineTo(80, 92)
      ctx.lineTo(24, 92)
      ctx.closePath()
      ctx.moveTo(62, 8)
      ctx.lineTo(62, 26)
      ctx.lineTo(80, 26)
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(34, 44 + i * 12)
        ctx.lineTo(70, 44 + i * 12)
      }
      ctx.stroke()
      break
    }
    case 'devops': {
      circle(50, 50, 16)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(50 + Math.cos(a) * 26, 50 + Math.sin(a) * 26)
        ctx.lineTo(50 + Math.cos(a) * 38, 50 + Math.sin(a) * 38)
        ctx.stroke()
      }
      circle(50, 50, 28)
      break
    }
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Draws one agent panel's face: a faint hex grid, corner brackets, the agent's glyph, name, role and a few mono status
 * lines. Strokes and text only, on a mostly transparent ground: the holo material adds scanlines and glow. Decorative:
 * the same text is in the HTML.
 */
export function drawAgentPanel(ctx: CanvasRenderingContext2D, agent: Agent, index = 0, total = 7): void {
  const { w, h } = PANEL_CANVAS
  ctx.clearRect(0, 0, w, h)

  // body tint
  const body = ctx.createLinearGradient(0, 0, 0, h)
  body.addColorStop(0, 'rgba(20,70,90,0.55)')
  body.addColorStop(0.5, 'rgba(10,40,55,0.4)')
  body.addColorStop(1, 'rgba(12,55,70,0.6)')
  ctx.fillStyle = body
  ctx.fillRect(0, 0, w, h)

  // hex grid
  ctx.strokeStyle = 'rgba(94,231,255,0.07)'
  ctx.lineWidth = 1
  const r = 22
  for (let row = 0; row * r * 1.5 < h + r; row++) {
    for (let col = 0; col * r * 1.732 < w + r; col++) {
      const cx = col * r * 1.732 + (row % 2 ? r * 0.866 : 0)
      const cy = row * r * 1.5
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        if (k === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }

  // outline and corner brackets
  ctx.strokeStyle = 'rgba(94,231,255,0.35)'
  ctx.lineWidth = 2
  ctx.strokeRect(14, 14, w - 28, h - 28)
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 6
  const L = 54
  for (const [x, y, sx, sy] of [
    [14, 14, 1, 1],
    [w - 14, 14, -1, 1],
    [14, h - 14, 1, -1],
    [w - 14, h - 14, -1, -1],
  ]) {
    ctx.beginPath()
    ctx.moveTo(x, y + sy * L)
    ctx.lineTo(x, y)
    ctx.lineTo(x + sx * L, y)
    ctx.stroke()
  }

  // header line
  ctx.textBaseline = 'alphabetic'
  ctx.font = `500 22px ${MONO}`
  ctx.fillStyle = 'rgba(94,231,255,0.85)'
  ctx.textAlign = 'left'
  ctx.fillText(`AGENT ${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`, 44, 62)
  ctx.textAlign = 'right'
  ctx.fillStyle = AMBER
  ctx.fillText('ONLINE', w - 74, 62)
  ctx.beginPath()
  ctx.arc(w - 52, 54, 6, 0, Math.PI * 2)
  ctx.fill()

  // glyph
  ctx.save()
  ctx.translate(w / 2 - 105, 150)
  ctx.scale(2.1, 2.1)
  ctx.lineWidth = 3.2
  ctx.strokeStyle = CYAN
  ctx.shadowColor = CYAN
  ctx.shadowBlur = 10
  drawGlyph(ctx, agent.id)
  ctx.restore()

  // name
  ctx.shadowBlur = 0
  ctx.textAlign = 'left'
  ctx.fillStyle = '#e8fbff'
  ctx.font = `600 62px ${DISPLAY}`
  let nameSize = 62
  while (ctx.measureText(agent.name).width > w - 88 && nameSize > 36) {
    nameSize -= 2
    ctx.font = `600 ${nameSize}px ${DISPLAY}`
  }
  ctx.fillText(agent.name, 44, 440)
  ctx.fillStyle = CYAN
  ctx.fillRect(44, 462, 96, 4)

  // role
  ctx.font = `400 27px ${SANS}`
  ctx.fillStyle = 'rgba(214,240,248,0.92)'
  wrap(ctx, agent.role, w - 88).forEach((line, i) => ctx.fillText(line, 44, 516 + i * 38))

  // status lines
  ctx.font = `500 21px ${MONO}`
  ctx.fillStyle = 'rgba(94,231,255,0.9)'
  const lines = STATUS[agent.id] ?? []
  lines.forEach((line, i) => ctx.fillText(`> ${line}`, 44, 706 + i * 36))

  // progress bar and a small sparkline
  ctx.strokeStyle = 'rgba(94,231,255,0.5)'
  ctx.lineWidth = 2
  ctx.strokeRect(44, 840, w - 88, 18)
  ctx.fillStyle = CYAN
  ctx.fillRect(48, 844, (w - 96) * (0.45 + ((index * 0.17) % 0.5)), 10)
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let i = 0; i <= 30; i++) {
    const x = 44 + (i / 30) * (w - 88)
    const y = 905 - Math.abs(Math.sin(i * 0.7 + index)) * 24 - Math.sin(i * 0.23) * 6
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

/** Loads the page fonts the panel text uses, so canvas text is not drawn in the fallback face. */
export async function loadPanelFonts(): Promise<void> {
  if (!('fonts' in document)) return
  await Promise.allSettled([
    document.fonts.load(`600 40px "Space Grotesk Variable"`),
    document.fonts.load(`400 24px "Inter Variable"`),
    document.fonts.load(`500 20px "JetBrains Mono Variable"`),
  ])
}
