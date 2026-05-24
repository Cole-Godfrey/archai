import "server-only"

import { Liveblocks } from "@liveblocks/node"

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

function getLiveblocksUserColor(userId: string) {
  let hash = 0

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0
  }

  return CURSOR_COLORS[hash % CURSOR_COLORS.length]
}

export { getLiveblocksClient, getLiveblocksUserColor }
