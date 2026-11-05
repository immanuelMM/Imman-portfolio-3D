import type { SkillCategory } from './types'

export const skillCategories: SkillCategory[] = [
  { name: 'Frontend', skills: ['Vue.js', 'TypeScript', 'Angular', 'Pixi.js', 'HTML', 'CSS'] },
  { name: 'Backend & DB', skills: ['Node.js', 'Ruby on Rails', '.NET', 'PHP', 'MySQL'] },
  { name: 'Tools & Others', skills: ['Git', 'GitLab', 'Heroku', 'Agile', 'OOP'] },
  {
    name: 'Main Skills Pool',
    skills: [
      'Problem-Solving',
      'Teamwork',
      'Adaptability',
      'Time Management',
      'Design Patterns',
      'Testing',
      'Debugging',
      'Algorithms',
      'Leadership',
      'Interpersonal Skills',
      'Work Ethic',
      'Creativity',
    ],
  },
]

export const aiSkills: string[] = [
  'Claude Code',
  'Multi-Agent Teams',
  'n8n Automation',
  'AI Workflow Design',
  'Antigravity AI',
  'Prompt Engineering',
  'AI Integration',
  'LLM Orchestration',
  'Agentic Coding',
  'REST AI APIs',
]

/** The source calls the soft-skill group "Main Skills Pool"; the CV and the site show "Professional Skills". */
export const CATEGORY_LABELS: Record<string, string> = { 'Main Skills Pool': 'Professional Skills' }

export function categoryLabel(name: string): string {
  return CATEGORY_LABELS[name] ?? name
}
