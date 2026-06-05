import "server-only"

import { Liveblocks } from "@liveblocks/node"

import { AI_CHAT_FEED_ID, AI_STATUS_FEED_ID } from "@/types/tasks"

const CURSOR_COLORS = [
  "#D6B56D",
  "#38D7BD",
  "#7FB7FF",
  "#B7A2FF",
  "#F0CC7A",
  "#FF817A",
  "#FF8CB5",
  "#7BD88F",
] as const

const globalForLiveblocks = globalThis as unknown as {
  liveblocks?: Liveblocks
}

function createLiveblocksClient() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY

  if (secret === undefined) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is required to initialize Liveblocks.")
  }

  return new Liveblocks({ secret })
}

function getLiveblocksClient() {
  const liveblocks = globalForLiveblocks.liveblocks ?? createLiveblocksClient()

  if (process.env.NODE_ENV !== "production") {
    globalForLiveblocks.liveblocks = liveblocks
  }

  return liveblocks
}

/** Room-scoped feeds the AI sidebar reads and writes. */
const ROOM_FEED_IDS = [AI_STATUS_FEED_ID, AI_CHAT_FEED_ID] as const

/**
 * Ensures the room's shared AI feeds exist. Liveblocks does not create a feed
 * implicitly — posting a message to a feed that has never been created fails —
 * so the feeds the sidebar reads and writes (`ai-status-feed`, `ai-chat`) must
 * be provisioned explicitly. Idempotent (skips feeds that already exist) and
 * best-effort (never throws), so it can run during room setup in the auth route
 * without blocking authorization. Runs once per room connection, not per
 * message, so the extra request is negligible.
 */
async function ensureRoomFeeds(roomId: string): Promise<void> {
  const liveblocks = getLiveblocksClient()

  let existingFeedIds: Set<string>

  try {
    const { data } = await liveblocks.getFeeds({ roomId })
    existingFeedIds = new Set(data.map((feed) => feed.feedId))
  } catch {
    // Treat an unreadable feed list as "none exist" and attempt creation; a
    // duplicate create is caught below.
    existingFeedIds = new Set()
  }

  for (const feedId of ROOM_FEED_IDS) {
    if (existingFeedIds.has(feedId)) {
      continue
    }

    try {
      await liveblocks.createFeed({ roomId, feedId })
    } catch {
      // A concurrent connection may have created it first, or the call was
      // transient; the read/write path surfaces any persistent problem.
    }
  }
}

function getLiveblocksUserColor(userId: string) {
  let hash = 0

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0
  }

  return CURSOR_COLORS[hash % CURSOR_COLORS.length]
}

export { ensureRoomFeeds, getLiveblocksClient, getLiveblocksUserColor }
