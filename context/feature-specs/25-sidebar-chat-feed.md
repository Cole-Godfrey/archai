Add real-time room chat to the AI sidebar using a separate Liveblocks `ai-chat` feed.

This is only for chat messages. Keep it separate from the `ai-status-feed`, which handles AI progress and presence updates.

## Implementation
1. Add the `ai-chat` feed:
    Before implementing, check the existing Liveblocks setup and follow the same feed patterns already used in the project.
    - Create or reuse a Libeblocks feed named `ai-chat`
    - Keep it room-scoped
    - Do not mix it with `ai-status-feed`
2. Wire the chat feed into the sidebar:
    - Subscribe to `ai-chat` in the sidebar chat area
    - Render chat messages in order
    - Show sender, timestamp, and message content
    - Keep the styling consistent with the existing sidebar UI
    - Use Tailwind utilities and existing shadcn components where they fit
3. Add sending messages:
    - Allow users in the room to send messages to `ai-chat`
    - Use the existing sidebar input and send button
    - Clear the input after sending is successful
    - Show a small error state if sending fails
4. Add message validation:
    - Define or reuse a Zod schema in `types/tasks.ts`
    - Message shape should include sender, role, content, and timestamp
    - Validate feed messages before rendering them

## Scope Limits
- Don't add AI-generated replies yet
- Don't trigger backend AI tasks
- Don't mix chat messages with status messages
- Don't create a parallel realtime system outside Liveblocks
- Keep this focused on the collaborative sidebar chat only

## Check When Done
- Sidebar subscribes to the `ai-chat` feed
- Users can send chat messages through the existing sidebar input
- Chat messages are validated before rendering
- `ai-chat` remains separate from `ai-status-feed`
- `npm run build` passes
