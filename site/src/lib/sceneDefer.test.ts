import { describe, expect, it, vi } from 'vitest'
import { ENGAGEMENT_EVENTS, onFirstEngagement } from './sceneDefer'

function setup() {
  const target = new EventTarget()
  let timerRun: (() => void) | undefined
  let cleared = false
  const timers = {
    set: (run: () => void) => {
      timerRun = run
      return 1
    },
    clear: () => {
      cleared = true
    },
  }
  return { target, timers, fire: () => timerRun?.(), wasCleared: () => cleared }
}

describe('onFirstEngagement', () => {
  it('runs once on the first input and drops the timer', () => {
    const { target, timers, wasCleared } = setup()
    const run = vi.fn()
    onFirstEngagement(target, run, 6000, timers)
    target.dispatchEvent(new Event('pointermove'))
    target.dispatchEvent(new Event('scroll'))
    expect(run).toHaveBeenCalledTimes(1)
    expect(wasCleared()).toBe(true)
  })

  it('runs after the fallback delay when nobody touches the page, and only once', () => {
    const { target, timers, fire } = setup()
    const run = vi.fn()
    onFirstEngagement(target, run, 6000, timers)
    expect(run).not.toHaveBeenCalled()
    fire()
    target.dispatchEvent(new Event('keydown'))
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('can be cancelled', () => {
    const { target, timers } = setup()
    const run = vi.fn()
    const cancel = onFirstEngagement(target, run, 6000, timers)
    cancel()
    target.dispatchEvent(new Event('pointerdown'))
    expect(run).not.toHaveBeenCalled()
  })

  it('listens for pointer, touch, key, wheel and scroll input', () => {
    expect([...ENGAGEMENT_EVENTS]).toEqual(['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel', 'scroll'])
  })
})
