Show active room participants inside the editor canvas view, without changing the editor home navbar.

## Implementation
1. Keep the existing navbar behavior as is:
    - Do not change the editor home navbar
    - Do not move or redesign the shared navbar component globally
    - If the editor home and editor canvas use the same navbar component, make sure this presence UI only appears in the canvas/editor room view
2. Add the participant avatar group inside the editor canvas area:
    - Position it in the top-right corner of the editor canvas view
    - Keep it visually separate from the main navbar actions
    - Get the current user's ID from the active Clerk session
    - Filter the Liveblocks presence list to exclude any entry whose user ID matches the current Clerk user ID
    - Render the filtered list as collaborator avatars only
    - Render the current user separately using the existing Clerk UserButton – do not render a second avatar for them from the Liveblocks presence list
    - Keep collaborator avatars and the Clerk UserButton the same size so the group looks visually consistent
    - Collaborator avatars are display-only, not interactive
    - Show a divider between the collaborator avatars and the Clerk UserButton only when at least one collaborator exists
    - If no collaborators are present, show only the Clerk UserButton with no divider
3. Render collaborator avatars:
    - Use profile photos when available
    - Fall back to initials when there is no image
    - Show up to five collaborator avatars in an overlapping stack
    - Show a +N overflow chip when there are more than five
    - Add a subtle ring so avatars stay readable on the dark canvas
4. Add live cursors to the canvas:
    - Render cursors for other participants only, never the current user
    - Use the existing Liveblocks presence state to broadcast the cursor position
    - Update the cursor position on React Flow's onMouseMove event
    - Clear cursor to null on mouse leave
    - Show a small colored pointer with a name badge attached
    - Match the pointer and badge color to the participant's presence color
5. Define the shared presence type in `liveblocks.config.ts`.
    Presence should include:
    - `cursor`: `{ x: number; y: number } | null`
    - `thinking`: boolean

## Scope Limits
- Don't add participant avatars to the shared navbar globally
- Don't remove existing navbar actions like Save, Import, Share, or AI
- Don't replace Clerk user/profile/logout behavior
- Don't make collaborator avatars interactive
- Don't change canvas node or edge behavior

## Check When Done
- Presence avatars only appear in the editor canvas view
- Editor home navbar is unchanged
- The current user is resolved from the active Clerk session
- Collaborator avatars always exclude the current user
- Divider only appears when collaborators exist
- Cursor position is broadcast via Liveblocks presence on ReactFlow mouse events
- Canvas renders live cursors for other participants only
- `npm run build` passes