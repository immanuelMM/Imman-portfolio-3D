import { withBase } from './withBase'

export interface SeoInput {
  /** Astro.site, the public origin, for example https://example.github.io */
  site: URL
  /** import.meta.env.BASE_URL, for example /immanuel-3d/ */
  base: string
  /** Astro.url.pathname of the page */
  pathname: string
  title: string
  description: string
  person: { name: string; jobTitle: string; sameAs: Array<string | undefined> }
}

/** Every URL in the head is absolute and carries the base path, so a project-page deploy and a custom domain both work. */
export function buildSeo({ site, base, pathname, title, description, person }: SeoInput) {
  const canonical = new URL(pathname, site).href
  const ogImage = new URL(withBase('og.png', base), site).href
  const favicon = withBase('favicon.svg', base)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    url: canonical,
    jobTitle: person.jobTitle,
    description,
    image: ogImage,
    sameAs: person.sameAs.filter((u): u is string => Boolean(u) && u!.startsWith('http')),
  }
  return { title, description, canonical, ogImage, favicon, jsonLd }
}

/** The sitemap-index file the @astrojs/sitemap integration writes next to index.html. */
export function sitemapUrl(site: URL, base: string): string {
  return new URL(withBase('sitemap-index.xml', base), site).href
}

export function robotsTxt(site: URL, base: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl(site, base)}\n`
}

/** JSON-LD inside a <script> must not be able to close the tag. */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
