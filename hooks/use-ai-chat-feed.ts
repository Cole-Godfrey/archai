"use client"

import { useCallback, useMemo, useState } from "react"

import {
  useCreateFeedMessage,
  useFeedMessages,
  useSelf,
} from "@liveblocks/react"

import { AI_AGENT_NAME } from "@/types/ai-design"
import {
  AI_CHAT_FEED_ID,
  parseAiChatFeedMessageData,
} from "@/types/tasks"

interface AiChatFeedEntry {
  id: string
  sender: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  isOwn: boolean
}

interface AiChatFeed {
  entries: AiChatFeedEntry[]
  sendMessage: (content: string) => Promise<boolean>
  sendAssistantMessage: (content: string) => Promise<boolean>
  sendError: string | null
  clearError: () => void
}

const SEND_ERROR_MESSAGE = "Message failed to send. Try again."

/**
 * Subscribes the sidebar chat area to the room's `ai-chat` feed and exposes
 * senders. Reads with the non-suspense feed hook (a missing/empty feed yields no
 * entries), validates every payload with {@link parseAiChatFeedMessageData}
 * before surfacing it, and orders entries chronologically by their authored
 * timestamp.
 *
 * `sendMessage` posts the participant's own (`user`) messages; `sendAssistantMessage`
 * posts the design agent's (`assistant`) completion/error notices under the
 * {@link AI_AGENT_NAME} identity. Both write to `ai-chat` only — this stays
 * entirely separate from the `ai-status-feed` and never reads or writes AI status.
 */
function useAiChatFeed(): AiChatFeed {
  const { messages } = useFeedMessages(AI_CHAT_FEED_ID)
  const createFeedMessage = useCreateFeedMessage()
  const self = useSelf()
  const [sendError, setSendError] = useState<string | null>(null)

  const selfName = self?.info?.name ?? "You"

  const entries = useMemo(() => {
    const parsed: AiChatFeedEntry[] = []

    for (const message of messages ?? []) {
      const data = parseAiChatFeedMessageData(message.data)

      if (data === null) {
        continue
      }

      parsed.push({
        id: message.id,
        sender: data.sender,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp,
        isOwn: data.sender === selfName,
      })
    }

    parsed.sort((a, b) => a.timestamp - b.timestamp)

    return parsed
  }, [messages, selfName])

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim()

      if (trimmedContent.length === 0) {
        return false
      }

      try {
        await createFeedMessage(AI_CHAT_FEED_ID, {
          sender: selfName,
          role: "user",
          content: trimmedContent,
          timestamp: Date.now(),
        })
        setSendError(null)
        return true
      } catch (error) {
        // Surface the underlying cause; the user only sees a generic notice.
        console.error("Failed to send chat message to ai-chat feed", error)
        setSendError(SEND_ERROR_MESSAGE)
        return false
      }
    },
    [createFeedMessage, selfName]
  )

  const sendAssistantMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim()

      if (trimmedContent.length === 0) {
        return false
      }

      // Agent notices are not the participant's own send, so a failure here is
      // not surfaced through `sendError` (which is reserved for `sendMessage`).
      try {
        await createFeedMessage(AI_CHAT_FEED_ID, {
          sender: AI_AGENT_NAME,
          role: "assistant",
          content: trimmedContent,
          timestamp: Date.now(),
        })
        return true
      } catch (error) {
        console.error("Failed to post assistant message to ai-chat feed", error)
        return false
      }
    },
    [createFeedMessage]
  )

  const clearError = useCallback(() => {
    setSendError(null)
  }, [])

  return { entries, sendMessage, sendAssistantMessage, sendError, clearError }
}

export { useAiChatFeed, type AiChatFeedEntry }
