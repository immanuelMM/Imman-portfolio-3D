/** Phone/tablet menu button: toggles the nav sheet (`[data-nav][data-open]`). Escape and a link tap close it. */
const header = document.querySelector<HTMLElement>('[data-nav]')
const toggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]')

if (header && toggle) {
  const set = (open: boolean) => {
    header.toggleAttribute('data-open', open)
    toggle.setAttribute('aria-expanded', String(open))
  }
  toggle.addEventListener('click', () => set(!header.hasAttribute('data-open')))
  header.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.site-nav a')) set(false)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.hasAttribute('data-open')) {
      set(false)
      toggle.focus()
    }
  })
}
