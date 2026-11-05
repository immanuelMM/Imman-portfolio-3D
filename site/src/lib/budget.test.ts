import { describe, expect, it } from 'vitest'
import {
  BUDGETS,
  baseFromHtml,
  classifyLazy,
  drawCounterScript,
  fmt,
  groupBytes,
  groupTriangles,
  parseHtmlScripts,
  parseInlineModules,
  parseStaticImports,
  row,
  splitChunks,
  trianglesOfDraw,
} from '../../scripts/budget-lib.mjs'

describe('plan section 5 limits', () => {
  it('has the plan numbers', () => {
    expect(BUDGETS.eagerJsGzip).toBe(60_000)
    expect(BUDGETS.sceneJsGzip).toBe(400_000)
    expect(BUDGETS.bloomGzip).toBe(30_000)
    expect(BUDGETS.docxGzip).toBe(200_000)
    expect(BUDGETS.poster).toBe(120 * 1024)
    expect(BUDGETS.desktop).toEqual({ first: 1_500_000, detail: 800_000, tris: 100_000, calls: 120 })
    expect(BUDGETS.phone).toEqual({ first: 800_000, detail: 400_000, tris: 60_000, calls: 70 })
  })
})

describe('chunks', () => {
  it('finds static imports and re-exports but not dynamic import()', () => {
    const code = `import{a as b}from"./react.AAA.js";import"./side.BBB.js";export{x}from"./re.CCC.js";const l=()=>import("./SceneRoot.DDD.js");`
    expect(parseStaticImports(code).sort()).toEqual(['./re.CCC.js', './react.AAA.js', './side.BBB.js'])
    expect(parseStaticImports(`import x from "three";`)).toEqual([])
  })

  const files = new Map([
    ['entry.js', `import"./helper.js";const go=()=>import("./SceneRoot.js")`],
    ['helper.js', 'export const h=1'],
    ['SceneRoot.js', `import{r}from"./events.js"`],
    ['events.js', 'export const r=1'],
    ['Bloom.X1.js', 'export const b=1'],
    ['docx.X2.js', 'export const d=1'],
  ])

  it('treats chunks reachable through static imports from the page as eager, the rest as lazy', () => {
    const html = '<script type="module" src="/base/_astro/entry.js"></script>'
    const { eager, lazy } = splitChunks(files, html)
    expect(eager.sort()).toEqual(['entry.js', 'helper.js'])
    expect(lazy.sort()).toEqual(['Bloom.X1.js', 'SceneRoot.js', 'docx.X2.js', 'events.js'])
  })

  it('reads inline module scripts and script sources', () => {
    const html = '<script type="module">import"/x";import"./helper.js"</script>'
    expect(parseInlineModules(html)).toHaveLength(1)
    expect(splitChunks(files, html).eager).toEqual(['helper.js'])
    expect(parseHtmlScripts('<script type="module" src="/a/_astro/x.1.js"></script>')).toEqual(['x.1.js'])
  })

  it('sorts lazy chunks into scene, bloom (high tier) and docx (on click)', () => {
    expect(
      classifyLazy(['SceneRoot.A.js', 'events-e5.esm.B.js', 'Bloom.C.js', 'docx.D.js', 'ProjectScreens.E.js']),
    ).toEqual({
      scene: ['SceneRoot.A.js', 'events-e5.esm.B.js', 'ProjectScreens.E.js'],
      bloom: ['Bloom.C.js'],
      docx: ['docx.D.js'],
    })
  })

  it('reads the base path from the first _astro URL', () => {
    expect(baseFromHtml('<link href="/immanuel-3d/_astro/index.css">')).toBe('/immanuel-3d/')
    expect(baseFromHtml('<script src="/_astro/a.js"></script>')).toBe('/')
    expect(baseFromHtml('<p>no assets</p>')).toBe('/')
  })
})

describe('asset groups', () => {
  const models = [
    { group: 'room-first', instances: 2, bytes: { desktop: 100, phone: 50 }, triangles: { desktop: 10, phone: 5 } },
    { group: 'room-first', instances: 1, bytes: { desktop: 70, phone: 30 }, triangles: { desktop: 7, phone: 3 } },
  ]
  const textures = [
    { file: 'textures/floor-diff.webp', group: 'room-first', bytes: 20 },
    { file: 'textures/floor-diff-phone.webp', group: 'room-first', bytes: 8 },
  ]
  const extra = [
    { group: 'detail-web', file: 'screens/atlas.webp', bytes: 19 },
    { group: 'detail-web', file: 'screens/atlas-phone.webp', bytes: 7 },
  ]

  it('counts the desktop and the phone variant the way the runtime loads them', () => {
    expect(groupBytes(models, textures, 'desktop', extra)).toEqual({ 'room-first': 190, 'detail-web': 19 })
    expect(groupBytes(models, textures, 'phone', extra)).toEqual({ 'room-first': 88, 'detail-web': 7 })
  })

  it('counts instanced props once per instance', () => {
    expect(groupTriangles(models, 'desktop')).toEqual({ 'room-first': 27 })
  })

  it('formats a report row and flags the ones over their limit', () => {
    expect(row('a', 5, 10).ok).toBe(true)
    expect(row('a', 11, 10).ok).toBe(false)
    expect(fmt(row('draw calls', 130, 120, 'calls'))).toMatch(/^FAIL .*130 \/ 120$/)
    expect(fmt(row('js', 4300, 60000))).toMatch(/^ok .*4\.3 KB \/ 60\.0 KB$/)
  })
})

describe('draw counting', () => {
  it('counts triangles of triangle lists, strips and fans, with instances, and ignores lines and points', () => {
    expect(trianglesOfDraw(4, 300)).toBe(100)
    expect(trianglesOfDraw(4, 36, 5)).toBe(60)
    expect(trianglesOfDraw(5, 6)).toBe(4)
    expect(trianglesOfDraw(6, 5, 2)).toBe(6)
    expect(trianglesOfDraw(1, 100)).toBe(0)
    expect(trianglesOfDraw(0, 100)).toBe(0)
  })

  it('ships an init script that parses and installs window.__frameCost', () => {
    const source = drawCounterScript()
    expect(() => new Function(source)).not.toThrow()
    expect(source).toContain('window.__frameCost')
    expect(source).toContain('drawElementsInstanced')
  })
})
