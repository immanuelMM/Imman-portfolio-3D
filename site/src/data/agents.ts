import type { Agent } from './types'

/** The seven Claude Code agents of the workspace workflow, in pipeline order (Lead first). Copy is editable. */
export const agents: Agent[] = [
  {
    id: 'lead',
    name: 'Lead',
    role: 'Orchestrates the team, verifies every report and runs the reviews',
    tools: ['Feature-dev command', 'Code explorer', 'Code architect', 'Code reviewer'],
  },
  {
    id: 'planner',
    name: 'Planner',
    role: 'Researches and writes the milestone plan',
    tools: ['Brainstorming', 'Writing plans', 'Executing plans', 'Skill creator'],
  },
  {
    id: 'backend',
    name: '.NET Backend',
    role: 'ASP.NET Core API, EF Core and the OpenAPI contract',
    tools: ['.NET backend standards', 'ASP.NET Core', 'EF Core', 'OpenAPI'],
  },
  {
    id: 'frontend',
    name: 'React Frontend',
    role: 'React and TypeScript UI built from the contract',
    tools: ['React frontend standards', '3D landing page', 'Frontend design', 'UI/UX Pro Max'],
  },
  {
    id: 'qa',
    name: 'QA',
    role: 'Playwright and unit tests, accessibility checks',
    tools: ['Playwright', 'Unit tests', 'Accessibility checks'],
  },
  { id: 'docs', name: 'Docs', role: 'Documents verified behaviour' },
  {
    id: 'devops',
    name: 'DevOps',
    role: 'Docker, GitHub Actions and deployment',
    tools: ['Docker', 'GitHub Actions', 'Deployment config'],
  },
]

/**
 * The workflow as ordered steps: Lead -> Planner -> Backend and Frontend in parallel -> QA -> Docs -> DevOps. One source
 * for the workflow strip, the detail cards and the pulse that runs through the 3D panels.
 */
export const WORKFLOW_STEPS: readonly (readonly Agent['id'][])[] = [
  ['lead'],
  ['planner'],
  ['backend', 'frontend'],
  ['qa'],
  ['docs'],
  ['devops'],
]
