import { CanvasTexture, SRGBColorSpace } from 'three'
import { rng } from './leds'

function canvas(w: number, h: number) {
  const el = document.createElement('canvas')
  el.width = w
  el.height = h
  return { el, ctx: el.getContext('2d')! }
}

function finish(el: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(el)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/**
 * A monitor face for the operator console: a dark UI with a header bar, a line chart, bars and rows of abstract "text"
 * blocks (nothing legible is baked into a texture). Drawn at runtime, 0 KB. `variant` changes the layout.
 */
export function createScreenTexture(variant: number): CanvasTexture {
  const w = 512
  const h = 288
  const { el, ctx } = canvas(w, h)
  const rnd = rng(100 + variant * 17)
  ctx.fillStyle = '#031017'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#082a36'
  ctx.fillRect(0, 0, w, 28)
  ctx.fillStyle = '#5ee7ff'
  ctx.fillRect(12, 10, 70, 8)
  ctx.fillStyle = '#ffb547'
  ctx.beginPath()
  ctx.arc(w - 18, 14, 5, 0, Math.PI * 2)
  ctx.fill()

  if (variant === 1) {
    // centre screen: a big chart over a table
    ctx.strokeStyle = 'rgba(94,231,255,0.18)'
    ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.moveTo(16, 50 + i * 24)
      ctx.lineTo(w - 16, 50 + i * 24)
      ctx.stroke()
    }
    ctx.strokeStyle = '#5ee7ff'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let i = 0; i <= 40; i++) {
      const x = 16 + (i / 40) * (w - 32)
      const y = 150 - Math.sin(i * 0.4) * 28 - rnd() * 22 - i * 0.8
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.strokeStyle = '#ffb547'
    ctx.beginPath()
    for (let i = 0; i <= 40; i++) {
      const x = 16 + (i / 40) * (w - 32)
      const y = 120 - Math.cos(i * 0.3) * 20 - rnd() * 12
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    for (let r = 0; r < 5; r++) {
      ctx.fillStyle = r % 2 ? 'rgba(94,231,255,0.5)' : 'rgba(150,210,225,0.35)'
      ctx.fillRect(16, 188 + r * 17, 60 + rnd() * 110, 7)
      ctx.fillRect(200, 188 + r * 17, 30 + rnd() * 90, 7)
      ctx.fillRect(360, 188 + r * 17, 20 + rnd() * 80, 7)
    }
  } else {
    // side screens: a log of coloured blocks and a few bars
    const colours = ['#5ee7ff', '#7be0a4', '#ffb547', '#9fb1c2']
    for (let r = 0; r < 12; r++) {
      let x = 16 + (rnd() < 0.3 ? 16 : 0)
      const y = 42 + r * 18
      while (x < w - 120) {
        const len = 18 + rnd() * 70
        ctx.fillStyle = colours[Math.floor(rnd() * colours.length)]
        ctx.globalAlpha = 0.55 + rnd() * 0.4
        ctx.fillRect(x, y, len, 7)
        x += len + 8
        if (rnd() < 0.15) break
      }
    }
    ctx.globalAlpha = 1
    for (let b = 0; b < 8; b++) {
      ctx.fillStyle = '#5ee7ff'
      const bh = 16 + rnd() * 60
      ctx.fillRect(w - 110 + b * 12, h - 14 - bh, 8, bh)
    }
  }
  return finish(el)
}

/** A flat keyboard: rows of keys with a faint cyan backlight (drawn, 0 KB). */
export function createKeyboardTexture(): CanvasTexture {
  const w = 512
  const h = 160
  const { el, ctx } = canvas(w, h)
  ctx.fillStyle = '#05080b'
  ctx.fillRect(0, 0, w, h)
  const rows = 5
  const rnd = rng(8)
  for (let r = 0; r < rows; r++) {
    const keyH = (h - 24) / rows - 4
    const y = 12 + r * (keyH + 4)
    let x = 12 + r * 4
    while (x < w - 24) {
      const kw = r === rows - 1 && x > 100 && x < 300 ? 190 : 26
      ctx.fillStyle = '#10171d'
      ctx.fillRect(x, y, kw, keyH)
      ctx.fillStyle = `rgba(94,231,255,${0.1 + rnd() * 0.14})`
      ctx.fillRect(x + 2, y + keyH - 5, kw - 4, 3)
      x += kw + 4
    }
  }
  return finish(el)
}
