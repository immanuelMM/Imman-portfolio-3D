import { certifications } from './certifications'
import { education } from './education'
import { experience } from './experience'
import { languages } from './languages'
import { profile } from './profile'
import { aiTools, staticProjects, webSystems } from './projects'
import { aiSkills, skillCategories } from './skills'
import type { SiteData } from './types'

export const siteData: SiteData = {
  profile,
  skillCategories,
  aiSkills,
  languages,
  experience,
  education,
  aiTools,
  webSystems,
  staticProjects,
  certifications,
}

export { agents, WORKFLOW_STEPS } from './agents'
export { credits } from './credits'
export { categoryLabel } from './skills'
export { SITE_TITLE, publicSiteUrl } from './site'
export type * from './types'
