// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

// GitHub Pages project repo: https://immanuelmm.github.io/immanuel-3d/. SITE_URL / BASE_PATH change it for a custom
// domain (BASE_PATH=/). Every runtime asset URL goes through withBase() (src/lib/withBase.ts).
// Build in Git Bash with MSYS_NO_PATHCONV=1, or the leading slash is rewritten to a Windows path.
const site = process.env.SITE_URL ?? 'https://immanuelmm.github.io'
const base = process.env.BASE_PATH ?? '/immanuel-3d/'

export default defineConfig({
  site,
  base,
  output: 'static',
  integrations: [sitemap()],
  server: { port: 4360 },
  devToolbar: { enabled: false },
})
