export interface Profile {
  name: string
  title: string
  availability: string
  emails: string[]
  phone: string
  /** City only: the street address, birth date and nationality are never shown. */
  city: string
  github: string
  about: string
}

export interface SkillCategory {
  name: string
  skills: string[]
}

/** Experience and education share one shape. */
export interface Entry {
  id: string
  role: string
  org: string
  period: string
  bullets: string[]
}

export interface Project {
  id: string
  title: string
  desc: string
  tags: string[]
  live?: string
  code?: string
  highlights?: string[]
  /** File name in `src/assets/ai/` */
  image?: string
  badge?: string
  featured?: boolean
}

export interface Certification {
  id: string
  name: string
  issuer: string
  year: string
  link?: string
}

export interface Language {
  name: string
  level: string
}

export interface Agent {
  id: string
  name: string
  role: string
}

export interface SiteData {
  profile: Profile
  skillCategories: SkillCategory[]
  aiSkills: string[]
  languages: Language[]
  experience: Entry[]
  education: Entry[]
  aiTools: Project[]
  webSystems: Project[]
  staticProjects: Project[]
  certifications: Certification[]
}
