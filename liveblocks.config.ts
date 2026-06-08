import type { LiveblocksFlow } from "@liveblocks/react-flow";

import type { AiAgentActivity } from "./types/ai-design";
import type { CanvasEdge, CanvasNode } from "./types/canvas";
import type {
  AiChatFeedMessageData,
  AiStatusFeedMessageData,
} from "./types/tasks";

declare global {
  interface Liveblocks {
    Presence: {
      cursor: {
        x: number
        y: number
      } | null
      thinking: boolean
      // Set only by the background design agent (via the Liveblocks node
      // client) so every participant sees its live progress; null for humans.
      aiActivity: AiAgentActivity | null
    };

    Storage: {
      flow?: LiveblocksFlow<CanvasNode, CanvasEdge>
    };

    UserMeta: {
      id: string
      info: {
        name: string
        avatar?: string
        color: string
      }
    };

    RoomEvent: Record<string, never>;

    // Payload of messages on the room's shared feeds, for useFeedMessages. A
    // union across the separate `ai-status-feed` and `ai-chat` feeds; each
    // reader validates with its own parser before using a message.
    FeedMessageData: AiStatusFeedMessageData | AiChatFeedMessageData;

    ThreadMetadata: Record<string, never>;

    RoomInfo: Record<string, never>;
  }
}

export {};
