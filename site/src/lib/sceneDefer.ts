/** Input that shows someone is really there: the heavy scene chunk is worth fetching and compiling now. */
export const ENGAGEMENT_EVENTS = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel', 'scroll'] as const

/** With no input at all the scene still starts this long after the page script runs (the poster is the same picture meanwhile). */
export const ENGAGEMENT_FALLBACK_MS = 9000

interface Timers {
  set: (run: () => void, ms: number) => unknown
  clear: (id: unknown) => void
}

const browserTimers: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
}

/**
 * Runs `run` once: on the first input event, or after `fallbackMs`, whichever comes first. Keeps shader compilation and
 * the first frames out of the page-load window (long tasks there decide Lighthouse's TBT and a phone's first scroll).
 * Returns a cancel function.
 */
export function onFirstEngagement(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  run: () => void,
  fallbackMs: number = ENGAGEMENT_FALLBACK_MS,
  timers: Timers = browserTimers,
): () => void {
  let done = false
  const finish = () => {
    if (done) return
    done = true
    cancel()
    run()
  }
  const timer = timers.set(finish, fallbackMs)
  for (const name of ENGAGEMENT_EVENTS) target.addEventListener(name, finish, { passive: true })
  function cancel() {
    timers.clear(timer)
    for (const name of ENGAGEMENT_EVENTS) target.removeEventListener(name, finish)
  }
  return () => {
    done = true
    cancel()
  }
}
