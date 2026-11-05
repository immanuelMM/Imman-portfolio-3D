/**
 * Eager, tiny gate for the hero scene. It decides the mode from the browser environment and only then imports the
 * lazy scene chunk (React + three.js). The poster path never downloads any of it.
 */
import { onFirstEngagement } from '../lib/sceneDefer'
import { detectSceneMode, readBrowserEnv } from '../lib/sceneGate'

const wrapper = document.getElementById('scene')
const mount = document.getElementById('scene-canvas')

function whenIdle(run: () => void) {
  const go = () =>
    'requestIdleCallback' in window ? window.requestIdleCallback(run, { timeout: 2000 }) : setTimeout(run, 200)
  if (document.readyState === 'complete') go()
  else window.addEventListener('load', go, { once: true })
}

if (wrapper && mount) {
  const setState = (state: string) => {
    wrapper.dataset.sceneState = state
  }

  if (detectSceneMode(readBrowserEnv()) === 'poster') {
    setState('poster')
  } else {
    // The scene chunk is fetched and compiled after `load`, once there is idle time AND someone is there (first input) or
    // 9 s have passed. The poster is the same picture until then, and the page load stays free of the shader-compile long tasks.
    onFirstEngagement(window, () =>
      whenIdle(() => {
        import('../islands/SceneRoot').then(
          ({ mountScene }) => mountScene(mount, setState),
          () => setState('poster'),
        )
      }),
    )
  }
}
