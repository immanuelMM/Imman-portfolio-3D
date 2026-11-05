/**
 * Eager and tiny. One delegated click handler for every `[data-cv]` button:
 * - pdf: sets the document title to the file name (the default name in "Save as PDF"), calls window.print(), restores
 *   the title on `afterprint`. The printed page is the build-rendered `#cv-print` (print.css).
 * - word: lazy-imports `lib/cv/docx` (the `docx` package) on the first click, shows a busy state and a toast.
 */
import { cvFileName } from '../lib/cv/fileName'
import type { CvModel } from '../lib/cv/model'

const toast = document.getElementById('cv-toast')
let toastTimer = 0

function say(message: string) {
  if (!toast) return
  toast.textContent = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.textContent = ''), 5000)
}

function readModel(): CvModel | null {
  const el = document.getElementById('cv-model')
  if (!el?.textContent) return null
  try {
    return JSON.parse(el.textContent) as CvModel
  } catch {
    return null
  }
}

function printPdf() {
  const model = readModel()
  const previous = document.title
  if (model) document.title = cvFileName(model)
  const restore = () => {
    document.title = previous
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
}

async function downloadWord(button: HTMLButtonElement) {
  const model = readModel()
  if (!model) return say('The CV could not be read. Please refresh and try again.')
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-cv="word"]')
  buttons.forEach((b) => {
    b.disabled = true
    b.setAttribute('aria-busy', 'true')
  })
  const label = button.textContent
  button.textContent = 'Preparing…'
  try {
    const { downloadCvDocx } = await import('../lib/cv/docx')
    await downloadCvDocx(model)
    say('Word CV downloaded')
  } catch (error) {
    console.error('Word generation error:', error)
    say('Word export failed. Please try again.')
  } finally {
    button.textContent = label
    buttons.forEach((b) => {
      b.disabled = false
      b.removeAttribute('aria-busy')
    })
  }
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  const button = target.closest<HTMLButtonElement>('[data-cv]')
  if (button) {
    document.querySelectorAll<HTMLDetailsElement>('[data-cv-menu]').forEach((d) => (d.open = false))
    if (button.dataset.cv === 'pdf') printPdf()
    else if (button.dataset.cv === 'word') void downloadWord(button)
    return
  }
  // Click outside an open Download CV menu closes it.
  document.querySelectorAll<HTMLDetailsElement>('[data-cv-menu][open]').forEach((d) => {
    if (!d.contains(target)) d.open = false
  })
})

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  document.querySelectorAll<HTMLDetailsElement>('[data-cv-menu][open]').forEach((d) => {
    d.open = false
    d.querySelector('summary')?.focus()
  })
})
