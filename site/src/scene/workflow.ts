import { WORKFLOW_STEPS } from '../data/agents'

/** One pass through the workflow takes this long, then it repeats. */
export const WORKFLOW_PERIOD = 6

const STEP_SECONDS = WORKFLOW_PERIOD / WORKFLOW_STEPS.length

/** Which agents are lit at time `t` seconds: Lead, Planner, Backend and Frontend together, QA, Docs, DevOps, one second each. */
export function activeAgents(t: number): string[] {
  const phase = ((t % WORKFLOW_PERIOD) + WORKFLOW_PERIOD) % WORKFLOW_PERIOD
  return [...WORKFLOW_STEPS[Math.min(WORKFLOW_STEPS.length - 1, Math.floor(phase / STEP_SECONDS))]]
}

/**
 * How strongly an agent's panel pulses at time `t` (0..1): a fast rise when its step starts, then a slow fall that has
 * faded out before the cycle comes round again.
 */
export function pulseLevel(agentId: string, t: number): number {
  const step = WORKFLOW_STEPS.findIndex((group) => group.includes(agentId))
  if (step < 0) return 0
  const phase =
    ((((t % WORKFLOW_PERIOD) + WORKFLOW_PERIOD) % WORKFLOW_PERIOD) - step * STEP_SECONDS + WORKFLOW_PERIOD) %
    WORKFLOW_PERIOD
  const rise = 0.12
  if (phase < rise) return phase / rise
  return Math.max(0, 1 - (phase - rise) / (STEP_SECONDS * 1.6))
}
