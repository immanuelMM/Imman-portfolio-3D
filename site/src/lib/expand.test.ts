import { describe, expect, it } from 'vitest'
import { initialExpanded, toggleAt } from './expand'

describe('expand state', () => {
  it('opens only the first entry', () => {
    expect(initialExpanded(4)).toEqual([true, false, false, false])
    expect(initialExpanded(0)).toEqual([])
    expect(initialExpanded(3, false)).toEqual([false, false, false])
  })

  it('toggles one entry and leaves the others alone', () => {
    const s = initialExpanded(3)
    expect(toggleAt(s, 1)).toEqual([true, true, false])
    expect(toggleAt(toggleAt(s, 1), 1)).toEqual(s)
    expect(toggleAt(s, 0)).toEqual([false, false, false])
  })

  it('does not mutate and ignores a bad index', () => {
    const s = [true, false]
    toggleAt(s, 1)
    expect(s).toEqual([true, false])
    expect(toggleAt(s, 5)).toEqual([true, false])
    expect(toggleAt(s, -1)).toEqual([true, false])
  })
})
