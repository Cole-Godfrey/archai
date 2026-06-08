"use client"

import { shallow, useFeedMessages, useOthersMapped } from "@liveblocks/react"

import { isActiveAiPhase } from "@/types/ai-design"
import { AI_STATUS_FEED_ID, parseAiStatusFeedMessageData } from "@/types/tasks"

interface AiActivityStatus {
  isActive: boolean
  statusText: string | null
}

/**
 * Reads the room-wide AI activity state for the sidebar: whether any agent
 * presence is mid-generation (`isActive`), and the latest validated status
 * message from the shared `ai-status-feed` (`statusText`). Both are derived
 * from shared Liveblocks state, so every participant sees the same indicator.
 *
 * Uses the non-suspense feed/presence hooks and tolerates a missing or empty
 * feed (it simply yields `statusText: null`) so the rest of the sidebar stays
 * usable while the room connects.
 */
function useAiActivityStatus(): AiActivityStatus {
  const activeFlags = useOthersMapped((other) => {
    const activity = other.presence.aiActivity
    return activity !== null && isActiveAiPhase(activity.phase)
  }, shallow)
  const { messages } = useFeedMessages(AI_STATUS_FEED_ID)

  const isActive = activeFlags.some(([, isWorking]) => isWorking)

  let statusText: string | null = null
  let latestCreatedAt = Number.NEGATIVE_INFINITY

  for (const message of messages ?? []) {
    const data = parseAiStatusFeedMessageData(message.data)

    if (
      data !== null &&
      data.text !== undefined &&
      message.createdAt > latestCreatedAt
    ) {
      statusText = data.text
      latestCreatedAt = message.createdAt
    }
  }

  return { isActive, statusText }
}

export { useAiActivityStatus }
