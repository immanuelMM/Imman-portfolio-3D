import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import screens from '../../public/screens/manifest.json'
import { agents } from '../data/agents'
import { aiTools } from '../data/projects'
import { createHighlightStore, parseHighlight, SCREEN_CELLS, screenIndex } from './sceneHighlight'

const ids = agents.map((a) => a.id)

describe('item to 3D highlight mapping', () => {
  it('keeps the screen cells in the atlas order of the manifest', () => {
    expect([...SCREEN_CELLS]).toEqual(screens.cells)
  })

  it('maps every AI project that has art to its atlas cell, and others to nothing', () => {
    for (const p of aiTools) {
      if (!p.image) continue
      const name = p.image.replace(/\.svg$/, '')
      expect(screenIndex(name), p.id).not.toBeNull()
      expect(screens.cells[screenIndex(name) as number], p.id).toBe(name)
    }
    expect(screenIndex('nope')).toBeNull()
  })

  it('parses agent and screen attributes and rejects anything unknown', () => {
    expect(parseHighlight('agent:qa', ids)).toEqual({ kind: 'agent', id: 'qa' })
    expect(parseHighlight('screen:master-brd', ids)).toEqual({ kind: 'screen', id: 'master-brd' })
    expect(parseHighlight('agent:ghost', ids)).toBeNull()
    expect(parseHighlight('screen:ghost', ids)).toBeNull()
    expect(parseHighlight('panel:qa', ids)).toBeNull()
    expect(parseHighlight('', ids)).toBeNull()
    expect(parseHighlight(null, ids)).toBeNull()
  })

  it('tells listeners only about real changes', () => {
    const store = createHighlightStore()
    const seen: unknown[] = []
    const off = store.subscribe((v) => seen.push(v))
    store.set({ kind: 'agent', id: 'qa' })
    store.set({ kind: 'agent', id: 'qa' })
    store.set(null)
    store.set(null)
    off()
    store.set({ kind: 'agent', id: 'lead' })
    expect(seen).toEqual([{ kind: 'agent', id: 'qa' }, null])
    expect(store.get()).toEqual({ kind: 'agent', id: 'lead' })
  })

  it('marks every agent button and the project cards in the markup', () => {
    const strip = readFileSync(path.join(__dirname, '..', 'components', 'AgentStrip.astro'), 'utf8')
    const card = readFileSync(path.join(__dirname, '..', 'components', 'ProjectCard.astro'), 'utf8')
    expect(strip).toContain('data-hl')
    expect(card).toContain('data-hl')
  })
})
