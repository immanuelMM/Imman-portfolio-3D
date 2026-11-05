import { describe, expect, it } from 'vitest'
import { buildSeo, robotsTxt, safeJsonLd, sitemapUrl } from './seo'

const site = new URL('https://example.github.io')
const input = {
  site,
  base: '/immanuel-3d/',
  pathname: '/immanuel-3d/',
  title: 'A title',
  description: 'A description',
  person: { name: 'Ada', jobTitle: 'Developer', sameAs: ['https://github.com/ada', '', undefined, 'mailto:x@y.z'] },
}

describe('buildSeo', () => {
  it('keeps the base path in the canonical, og image and favicon', () => {
    const seo = buildSeo(input)
    expect(seo.canonical).toBe('https://example.github.io/immanuel-3d/')
    expect(seo.ogImage).toBe('https://example.github.io/immanuel-3d/og.png')
    expect(seo.favicon).toBe('/immanuel-3d/favicon.svg')
  })

  it('works on a custom domain with the root base', () => {
    const seo = buildSeo({ ...input, base: '/', pathname: '/' })
    expect(seo.canonical).toBe('https://example.github.io/')
    expect(seo.ogImage).toBe('https://example.github.io/og.png')
    expect(seo.favicon).toBe('/favicon.svg')
  })

  it('builds a Person JSON-LD with only http(s) profile links', () => {
    const { jsonLd } = buildSeo(input)
    expect(jsonLd['@type']).toBe('Person')
    expect(jsonLd.name).toBe('Ada')
    expect(jsonLd.sameAs).toEqual(['https://github.com/ada'])
  })
})

describe('robots and sitemap', () => {
  it('points the sitemap at the index under the base path', () => {
    expect(sitemapUrl(site, '/immanuel-3d/')).toBe('https://example.github.io/immanuel-3d/sitemap-index.xml')
    expect(robotsTxt(site, '/')).toContain('Sitemap: https://example.github.io/sitemap-index.xml')
    expect(robotsTxt(site, '/')).toContain('User-agent: *')
  })
})

describe('safeJsonLd', () => {
  it('cannot close the script tag', () => {
    expect(safeJsonLd({ name: '</script><b>' })).not.toContain('</script>')
  })
})
