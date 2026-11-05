import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { agents, siteData } from './index'

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out))
  return out
}

describe('siteData', () => {
  it('has the experience entries in source order', () => {
    expect(siteData.experience.map((e) => e.id)).toEqual(['exp1', 'exp2', 'exp3', 'exp4'])
    expect(siteData.experience[0].role).toBe('Software Engineer Lead')
    expect(siteData.experience[3].period).toBe('April 2013 – August 2014')
  })

  it('has three education entries', () => {
    expect(siteData.education.map((e) => e.id)).toEqual(['edu1', 'edu2', 'edu3'])
  })

  it('has six AI tools, featured first, in source order', () => {
    expect(siteData.aiTools.map((p) => p.id)).toEqual(['ai6', 'ai4', 'ai5', 'ai1', 'ai2', 'ai3'])
    expect(siteData.aiTools.filter((p) => p.featured).map((p) => p.id)).toEqual(['ai6', 'ai4', 'ai5'])
  })

  it('shows the n8n card without a Live link (login page)', () => {
    const n8n = siteData.aiTools.find((p) => p.id === 'ai1')
    expect(n8n?.live).toBeUndefined()
  })

  it('has four web systems (no ws_agent) and five static projects', () => {
    expect(siteData.webSystems.map((p) => p.id)).toEqual(['ws1', 'ws2', 'ws3', 'ws4'])
    expect(siteData.staticProjects).toHaveLength(5)
  })

  it('has three certifications; the TESDA one has no link', () => {
    expect(siteData.certifications).toHaveLength(3)
    expect(siteData.certifications.find((c) => c.id === 'cert2')?.link).toBeUndefined()
  })

  it('has one profile with city only, two emails and a phone', () => {
    expect(siteData.profile.city).toBe('Apalit, Philippines')
    expect(siteData.profile.emails).toEqual(['immanuel@qstrike.com', 'immanuelmahusay@mcgi.org'])
    expect(siteData.profile.phone).toBe('+63 976 036 0023')
  })

  it('has seven agents with unique ids', () => {
    expect(agents).toHaveLength(7)
    expect(new Set(agents.map((a) => a.id)).size).toBe(7)
    expect(agents[0].id).toBe('lead')
  })

  it('references image files that exist', () => {
    for (const p of siteData.aiTools) {
      if (!p.image) continue
      const path = fileURLToPath(new URL(`../assets/ai/${p.image}`, import.meta.url))
      expect(existsSync(path), p.image).toBe(true)
    }
  })

  it('has none of the banned strings and no placeholder social links', () => {
    const banned = /linkedin\.com\/in\/?$|twitter\.com\/?$|Highview|P2-B2|Dec 24, 1991|Mahusay1991/
    for (const s of strings(siteData)) expect(s).not.toMatch(banned)
    expect(JSON.stringify(siteData)).not.toMatch(/Filipino\s+•/)
  })

  it('uses https for every URL', () => {
    const urls = strings(siteData).filter((s) => /^[a-z][a-z0-9+.-]*:\/\//i.test(s))
    expect(urls.length).toBeGreaterThan(10)
    for (const u of urls) expect(u.startsWith('https://'), u).toBe(true)
  })
})
