/** Public URL of the site: `Astro.site` + the base path. `null` in dev, so the CV leaves out its Portfolio link. */
export function publicSiteUrl(site: URL | undefined, base: string, dev: boolean): string | null {
  if (dev || !site) return null
  const prefix = base.endsWith('/') ? base : `${base}/`
  return new URL(prefix, site).href
}

export const SITE_TITLE = 'Immanuel Mahusay — Software Engineer'
