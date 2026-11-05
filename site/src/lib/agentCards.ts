import { agents } from '../data/agents'
import { createAgentCardStore } from './agentCard'

/** The one shared store instance (bundled as a tiny shared chunk between the eager script and the lazy scene). */
export const agentCards = createAgentCardStore(agents.map((a) => a.id))
