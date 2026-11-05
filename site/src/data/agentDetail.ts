import { agents, WORKFLOW_STEPS } from './agents'
import type { Agent } from './types'

export interface AgentDetail {
  id: Agent['id']
  name: string
  role: string
  /** 1-based step in the workflow */
  step: number
  stepCount: number
  /** e.g. "Step 3 of 6, in parallel with React Frontend" */
  stepLabel: string
  /** names of the agents whose output this one takes over (empty for Lead) */
  receivesFrom: string[]
  /** names of the agents it hands over to (empty for DevOps) */
  handsTo: string[]
  tools: string[]
  /** neighbours in pipeline order, for the card's previous / next buttons */
  prev: Agent['id'] | null
  next: Agent['id'] | null
}

const nameOf = (id: Agent['id']) => agents.find((a) => a.id === id)?.name ?? id

/** Everything the detail card shows for one agent, derived from `agents.ts`: no copy of its own. */
export function agentDetail(id: Agent['id']): AgentDetail | null {
  const index = agents.findIndex((a) => a.id === id)
  if (index < 0) return null
  const agent = agents[index]
  const stepIndex = WORKFLOW_STEPS.findIndex((group) => group.includes(id))
  const group = WORKFLOW_STEPS[stepIndex]
  const partners = group.filter((other) => other !== id).map(nameOf)
  const stepCount = WORKFLOW_STEPS.length
  return {
    id,
    name: agent.name,
    role: agent.role,
    step: stepIndex + 1,
    stepCount,
    stepLabel: `Step ${stepIndex + 1} of ${stepCount}${partners.length ? `, in parallel with ${partners.join(' and ')}` : ''}`,
    receivesFrom: stepIndex > 0 ? WORKFLOW_STEPS[stepIndex - 1].map(nameOf) : [],
    handsTo: stepIndex < stepCount - 1 ? WORKFLOW_STEPS[stepIndex + 1].map(nameOf) : [],
    tools: agent.tools ?? [],
    prev: index > 0 ? agents[index - 1].id : null,
    next: index < agents.length - 1 ? agents[index + 1].id : null,
  }
}
