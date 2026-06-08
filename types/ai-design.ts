/**
 * Shared identity and presence contracts for the AI design agent.
 *
 * Kept free of server-only and heavy dependencies (no zod, AI SDK, or
 * Liveblocks node client) so it can be imported by the Liveblocks config, the
 * client-side canvas overlays, and the background task alike.
 */

/** Stable Liveblocks user id the design agent publishes presence under. */
const AI_AGENT_USER_ID = "archai-design-agent"

/** Display name shown on the agent's live cursor and participant avatar. */
const AI_AGENT_NAME = "Archai"

/** Teal AI accent (matches `--accent-ai`) for the agent's cursor and avatar. */
const AI_AGENT_COLOR = "#38D7BD"

const AI_AGENT_PHASES = ["thinking", "designing", "complete", "error"] as const

type AiAgentPhase = (typeof AI_AGENT_PHASES)[number]

/**
 * A single human-readable progress update broadcast to every participant.
 *
 * Declared as a type alias (not an interface) so it is assignable to
 * Liveblocks' `Json` type when embedded in the global `Presence`.
 */
type AiAgentActivity = {
  phase: AiAgentPhase
  message: string
}

/**
 * Presence the design agent writes through the Liveblocks node client. Mirrors
 * the global `Liveblocks["Presence"]` shape; only the agent ever sets a
 * non-null `aiActivity`.
 */
type AiAgentPresence = {
  cursor: { x: number; y: number } | null
  thinking: boolean
  aiActivity: AiAgentActivity | null
}

/**
 * True while the agent is mid-generation, false for the terminal `complete` /
 * `error` phases. Shared so presence publishing and every status consumer agree
 * on what "actively working" means.
 */
function isActiveAiPhase(phase: AiAgentPhase): boolean {
  return phase === "thinking" || phase === "designing"
}

export {
  AI_AGENT_COLOR,
  AI_AGENT_NAME,
  AI_AGENT_PHASES,
  AI_AGENT_USER_ID,
  isActiveAiPhase,
  type AiAgentActivity,
  type AiAgentPhase,
  type AiAgentPresence,
}
