Add shared AI activity indicators so everyone in the room can see when generation is in progress. This unit is only for UI, presence, and realtime status signals. Do not add the actual AI generation flow yet.

## Implementation
1. Add AI thinking state to the sidebar:
    - Show a small status indicator when AI is working
    - Make the status visible to everyone in the room
    - Disable the chat input while generation is active
    - Show a loading state on the Send button
    - Keep the rest of the sidebar usable
2. Add a shared AI status feed:
    - Check the existing Liveblocks setup and installed agent-related features first
    - Follow Liveblocks best practices for feeds/presence instead of creating a parallel realtime state
    - Create or reuse a Liveblocks feed name `ai-status-feed`
    - Subscribe to the latest feed message in the sidebar
    - Show only the most recent status message
    - Keep the feed generic enough for design and spec generation later
3. Add status message validation:
    - Define the feel payload schema in `types/tasks.ts`
    - The payload should support an optional `text` field
    - Validate incoming messages before displaying them
4. Add thinking indicators to live cursors:
    - When a participant has `thinking: true` in presence, show a small spinner in their cursor name badge
    - Hide the spinner when `thinking` is false or missing

## Scope Limits
- Don't add actual AI generation logic
- Don't trigger background tasks yet
- Don't block or dim the whole sidebar
- Don't show the full feed history
- Keep this focused on the shared AI activity state only

## Check When Done
- Sidebar can render shared AI status from `ai-status-feed`
- Chat input and send button respond to the active generation state
- Cursor badges read `thinking` from presence
- Feed messages are validated through the task schema
- `npm run build` passes

