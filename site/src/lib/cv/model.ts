import { categoryLabel } from '../../data/skills'
import type { Project, SiteData } from '../../data/types'

/**
 * The one CV model behind both outputs: the print/PDF copy (`CvDocument.astro`, rendered at build time) and the Word
 * file (`docx.ts`). Same order and labels as AI_Porfolio's `cv.js`.
 * Never on the CV: photo, street address, birth date, nationality. `SiteData` does not carry them, and
 * `cv.privacy.test.ts` checks the model and the generated docx.
 */
export interface CvLink {
  label: string
  text: string
  href: string
}

export interface CvContact {
  text: string
  href?: string
}

export interface CvEntry {
  title: string
  org: string
  period: string
  bullets: string[]
}

export interface CvProject {
  title: string
  desc: string
  bullets: string[]
  tech: string[]
  links: CvLink[]
}

export interface CvModel {
  name: string
  title: string
  contact: CvContact[]
  links: CvLink[]
  summary: string
  skills: { label: string; items: string[] }[]
  experience: CvEntry[]
  projectGroups: { label: string; items: CvProject[] }[]
  education: CvEntry[]
  certifications: { name: string; issuer: string; year: string; link: string }[]
  languages: { name: string; level: string }[]
}

/** "https://www.github.com/me/" -> "github.com/me" */
export function cvShortUrl(url: string): string {
  return String(url || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
}

export { cvFileName } from './fileName'

const clean = (items: string[] | undefined): string[] => (items ?? []).map((s) => String(s).trim()).filter(Boolean)

export function buildCvModel(data: SiteData, siteUrl: string | null): CvModel {
  const { profile } = data

  const contact: CvContact[] = [
    ...profile.emails.map((e) => ({ text: e, href: `mailto:${e}` })),
    { text: profile.phone, href: `tel:${profile.phone.replace(/[^\d+]/g, '')}` },
    { text: profile.city },
  ]

  const links: CvLink[] = []
  if (siteUrl) links.push({ label: 'Portfolio', text: cvShortUrl(siteUrl), href: siteUrl })
  links.push({ label: 'GitHub', text: cvShortUrl(profile.github), href: profile.github })

  const skills = data.skillCategories
    .map((c) => ({ label: categoryLabel(c.name), items: clean(c.skills) }))
    .filter((s) => s.items.length > 0)
  const ai = clean(data.aiSkills)
  if (ai.length > 0) {
    // AI skills sit right after the technical categories, before the soft-skill pool.
    const entry = { label: 'AI & Automation', items: ai }
    const at = skills.findIndex((s) => s.label === 'Professional Skills')
    if (at >= 0) skills.splice(at, 0, entry)
    else skills.push(entry)
  }

  const entry = (e: SiteData['experience'][number]): CvEntry => ({
    title: e.role,
    org: e.org,
    period: e.period,
    bullets: clean(e.bullets),
  })

  const project = (p: Project): CvProject => ({
    title: p.title,
    desc: p.desc,
    bullets: clean(p.highlights),
    tech: clean(p.tags),
    links: [
      p.live ? { label: 'Live', text: cvShortUrl(p.live), href: p.live } : null,
      p.code ? { label: 'Code', text: cvShortUrl(p.code), href: p.code } : null,
    ].filter((l): l is CvLink => l !== null),
  })

  // Projects: AI work first, then web systems, then websites; each title is listed once (case-insensitive).
  const seen = new Set<string>()
  const unique = (items: Project[]) =>
    items.filter((p) => {
      const key = p.title.trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  const projectGroups = [
    { label: 'AI & Automation', items: unique(data.aiTools).map(project) },
    { label: 'Web Systems', items: unique(data.webSystems).map(project) },
    { label: 'Websites', items: unique(data.staticProjects).map(project) },
  ].filter((g) => g.items.length > 0)

  return {
    name: profile.name,
    title: profile.title,
    contact,
    links,
    summary: profile.about.trim(),
    skills,
    experience: data.experience.map(entry),
    projectGroups,
    education: data.education.map(entry),
    certifications: data.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      year: c.year,
      link: c.link ?? '',
    })),
    languages: data.languages.filter((l) => l.name),
  }
}
