/**
 * Shared contracts for the Liveblocks feeds used by the AI sidebar.
 *
 * Two independent room-scoped feeds live here and must stay separate:
 * - `ai-status-feed` — AI progress/presence status (see {@link AI_STATUS_FEED_ID}).
 * - `ai-chat` — collaborative human chat (see {@link AI_CHAT_FEED_ID}).
 *
 * The status contracts are intentionally dependency-light; the chat payload is
 * validated with zod so untrusted feed messages can be rejected before render.
 */
import { z } from "zod"

/**
 * Liveblocks feed that carries shared, human-readable AI status updates for a
 * room. Created-or-reused by whichever writer posts status (design or spec
 * generation) so every participant can see the latest progress message.
 */
const AI_STATUS_FEED_ID = "ai-status-feed"

/**
 * Payload stored on each `ai-status-feed` message.
 *
 * Declared as a type alias (not an interface) so it stays assignable to
 * Liveblocks' `Json` type when used as the global `FeedMessageData`. The shape
 * is intentionally minimal and generic — a single optional `text` field — so
 * design and spec generation can both reuse it without a schema change.
 */
type AiStatusFeedMessageData = {
  text?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Validates an untrusted feed message payload before it is displayed. Returns a
 * normalized {@link AiStatusFeedMessageData} or `null` when the payload is not
 * an object or carries a non-string `text` field.
 */
function parseAiStatusFeedMessageData(
  data: unknown
): AiStatusFeedMessageData | null {
  if (!isRecord(data)) {
    return null
  }

  const { text } = data

  if (text !== undefined && typeof text !== "string") {
    return null
  }

  return text === undefined ? {} : { text }
}

/**
 * Liveblocks feed that carries collaborative human chat for a room. Kept
 * entirely separate from {@link AI_STATUS_FEED_ID}: status messages and chat
 * messages never share a feed.
 */
const AI_CHAT_FEED_ID = "ai-chat"

/**
 * Roles a chat message can carry. Only `user` is produced today (no AI replies
 * yet), but `assistant` is reserved so a future generation flow can post into
 * the same feed without a schema change.
 */
const aiChatMessageRoleSchema = z.enum(["user", "assistant"])

/**
 * Validation schema for an `ai-chat` feed message payload. `sender` is the
 * author's display name, `content` the message body, and `timestamp` the
 * authoring time in epoch milliseconds.
 */
const aiChatFeedMessageDataSchema = z.object({
  sender: z.string().min(1),
  role: aiChatMessageRoleSchema,
  content: z.string().min(1),
  timestamp: z.number().finite(),
})

/**
 * Payload stored on each `ai-chat` message.
 *
 * Declared via `z.infer` (a plain object type, not an interface) so it stays
 * assignable to Liveblocks' `Json` type when used in the global
 * `FeedMessageData` union.
 */
type AiChatFeedMessageData = z.infer<typeof aiChatFeedMessageDataSchema>

type AiChatMessageRole = z.infer<typeof aiChatMessageRoleSchema>

/**
 * Validates an untrusted `ai-chat` feed message payload before it is rendered.
 * Returns a normalized {@link AiChatFeedMessageData} or `null` when the payload
 * does not match the schema.
 */
function parseAiChatFeedMessageData(
  data: unknown
): AiChatFeedMessageData | null {
  const result = aiChatFeedMessageDataSchema.safeParse(data)

  return result.success ? result.data : null
}

export {
  AI_STATUS_FEED_ID,
  AI_CHAT_FEED_ID,
  aiChatFeedMessageDataSchema,
  parseAiStatusFeedMessageData,
  parseAiChatFeedMessageData,
  type AiStatusFeedMessageData,
  type AiChatFeedMessageData,
  type AiChatMessageRole,
}
