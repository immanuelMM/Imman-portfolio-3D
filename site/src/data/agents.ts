import type { Agent } from './types'

/** The seven Claude Code agents of the workspace workflow, in pipeline order (Lead first). Copy is editable. */
export const agents: Agent[] = [
  { id: 'lead', name: 'Lead', role: 'Orchestrates the team, verifies every report and runs the reviews' },
  { id: 'planner', name: 'Planner', role: 'Researches and writes the milestone plan' },
  { id: 'backend', name: '.NET Backend', role: 'ASP.NET Core API, EF Core and the OpenAPI contract' },
  { id: 'frontend', name: 'React Frontend', role: 'React and TypeScript UI built from the contract' },
  { id: 'qa', name: 'QA', role: 'Playwright and unit tests, accessibility checks' },
  { id: 'docs', name: 'Docs', role: 'Documents verified behaviour' },
  { id: 'devops', name: 'DevOps', role: 'Docker, GitHub Actions and deployment' },
]
