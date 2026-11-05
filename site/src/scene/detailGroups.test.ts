import { describe, expect, it } from 'vitest'
import { CHAPTER_IDS } from './chapters'
import { groupsWanted } from './DetailGroups'

describe('detail groups', () => {
  it('draws neither group in the hero (About) or Experience views', () => {
    for (const id of ['about', 'experience'] as const)
      expect(groupsWanted(id)).toEqual({ screens: false, archive: false })
  })

  it('wants the project screens from AI on (current or next of #web) and the archive from Web on (#education)', () => {
    expect(groupsWanted('ai')).toEqual({ screens: true, archive: false })
    expect(groupsWanted('web')).toEqual({ screens: true, archive: true })
    expect(groupsWanted('education')).toEqual({ screens: true, archive: true })
    expect(groupsWanted('contact')).toEqual({ screens: true, archive: true })
  })

  it('only ever turns groups on as the story advances', () => {
    let screens = false
    let archive = false
    for (const id of CHAPTER_IDS) {
      const want = groupsWanted(id)
      expect(want.screens || !screens).toBe(true)
      expect(want.archive || !archive).toBe(true)
      screens = want.screens
      archive = want.archive
    }
  })
})
