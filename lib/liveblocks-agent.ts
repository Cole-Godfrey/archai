import { Liveblocks } from "@liveblocks/node"

import {
  AI_AGENT_COLOR,
  AI_AGENT_NAME,
  AI_AGENT_USER_ID,
  type AiAgentActivity,
  type AiAgentPresence,
} from "@/types/ai-design"

// Keep the agent's live presence alive slightly longer than the generation
// timeout; each `setPresence` call refreshes the TTL. Terminal phases use a
// short TTL so the agent disappears from the room shortly after it finishes.
const ACTIVE_PRESENCE_TTL_SECONDS = 105
const FINAL_PRESENCE_TTL_SECONDS = 6

let cachedClient: Liveblocks | undefined

/**
 * Returns a cached Liveblocks node client used by the design agent to mutate
 * room storage and publish presence. Reads the secret at call time so config
 * evaluation never depends on the environment being hydrated yet.
 */
function getAgentLiveblocksClient(): Liveblocks {
  if (cachedClient !== undefined) {
    return cachedClient
  }

  const secret = process.env.LIVEBLOCKS_SECRET_KEY

  if (secret === undefined || secret.length === 0) {
    throw new Error(
      "LIVEBLOCKS_SECRET_KEY is required for the design agent to update the canvas."
    )
  }

  cachedClient = new Liveblocks({ secret })

  return cachedClient
}

/**
 * Publishes the agent's ephemeral presence (cursor + thinking + activity) to a
 * room so every participant sees its progress in real time, reusing the
 * existing cursor/avatar/presence rendering. Terminal phases auto-expire,
 * clearing the agent from the room.
 */
async function publishAgentPresence(
  roomId: string,
  activity: AiAgentActivity,
  cursor: { x: number; y: number } | null
): Promise<void> {
  const isWorking = activity.phase === "thinking" || activity.phase === "designing"
  const presence: AiAgentPresence = {
    cursor: cursor === null ? null : { x: cursor.x, y: cursor.y },
    thinking: isWorking,
    aiActivity: { phase: activity.phase, message: activity.message },
  }

  await getAgentLiveblocksClient().setPresence(roomId, {
    userId: AI_AGENT_USER_ID,
    data: presence,
    userInfo: { name: AI_AGENT_NAME, color: AI_AGENT_COLOR },
    ttl: isWorking ? ACTIVE_PRESENCE_TTL_SECONDS : FINAL_PRESENCE_TTL_SECONDS,
  })
}

export { getAgentLiveblocksClient, publishAgentPresence }
