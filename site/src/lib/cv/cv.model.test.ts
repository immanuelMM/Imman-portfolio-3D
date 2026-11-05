import { describe, expect, it } from 'vitest'
import { siteData } from '../../data'
import { buildCvModel, cvFileName, cvShortUrl } from './model'

const SITE = 'https://immanuelmm.github.io/immanuel-3d/'
const model = buildCvModel(siteData, SITE)

describe('buildCvModel', () => {
  it('orders the skills with AI & Automation before Professional Skills', () => {
    expect(model.skills.map((s) => s.label)).toEqual([
      'Frontend',
      'Backend & DB',
      'Tools & Others',
      'AI & Automation',
      'Professional Skills',
    ])
  })

  it('groups projects AI -> Web Systems -> Websites', () => {
    expect(model.projectGroups.map((g) => [g.label, g.items.length])).toEqual([
      ['AI & Automation', 6],
      ['Web Systems', 4],
      ['Websites', 5],
    ])
  })

  it('lists the multi-agent project once', () => {
    const titles = model.projectGroups.flatMap((g) => g.items.map((p) => p.title.toLowerCase()))
    expect(titles.filter((t) => t === 'full stack ai agent – multi-agent software team')).toHaveLength(1)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('has contact lines: two mailto, the phone as tel, and the city only', () => {
    expect(model.contact.filter((c) => c.href?.startsWith('mailto:'))).toHaveLength(2)
    expect(model.contact.some((c) => c.href === 'tel:+639760360023')).toBe(true)
    expect(model.contact.at(-1)).toEqual({ text: 'Apalit, Philippines' })
  })

  it('has a Portfolio and a GitHub link, and no Portfolio link without a site URL', () => {
    expect(model.links.map((l) => l.label)).toEqual(['Portfolio', 'GitHub'])
    expect(model.links[0]).toEqual({ label: 'Portfolio', text: 'immanuelmm.github.io/immanuel-3d', href: SITE })
    expect(buildCvModel(siteData, null).links.map((l) => l.label)).toEqual(['GitHub'])
  })

  it('keeps the experience order, the summary and the languages', () => {
    expect(model.experience.map((e) => e.title)[0]).toBe('Software Engineer Lead')
    expect(model.experience).toHaveLength(4)
    expect(model.education).toHaveLength(3)
    expect(model.summary).toBe(siteData.profile.about)
    expect(model.languages).toEqual([
      { name: 'Filipino', level: 'Native' },
      { name: 'English', level: 'Proficient' },
    ])
  })

  it('gives the project links Live and Code, short', () => {
    const first = model.projectGroups[0].items[0]
    expect(first.links.map((l) => l.label)).toEqual(['Live', 'Code'])
    expect(first.links[0].text).toBe('full-stack-ai-agent-vybc.onrender.com/portfolio')
  })

  it('drops the TESDA homepage as a credential link', () => {
    expect(model.certifications.find((c) => c.name.startsWith('TESDA'))?.link).toBe('')
    expect(model.certifications.filter((c) => c.link)).toHaveLength(2)
  })
})

describe('cvShortUrl and cvFileName', () => {
  it('shortens URLs', () => {
    expect(cvShortUrl('https://www.github.com/me/')).toBe('github.com/me')
    expect(cvShortUrl('http://a.b/c')).toBe('a.b/c')
  })

  it('names the file after the person', () => {
    expect(cvFileName(model)).toBe('Immanuel_Mahusay_CV')
    expect(cvFileName({ name: '' })).toBe('CV_CV')
  })
})
