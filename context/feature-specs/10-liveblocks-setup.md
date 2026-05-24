Set up the realtime collaboration infrastructure using Liveblocks.

## Configuration
Configure the `liveblocks.config.ts` at the project root.

Define:

### Presence
- Cursor position
- `isThinking` boolean

### UserMeta
- User ID
- Display name
- Avatar URL
- Cursor color

## Liveblocks Client
Create a cached Liveblocks node client in `lib`.

Add a helper that deterministically maps a user ID to a consistent color from a fixed palette.

## Auth Route
Create `POST /api/liveblocks-auth`.

Use the project ID as the Liveblocks room ID.

This route must:
1. Require Clerk authentication
2. Verify project access using the existing access helper
3. Ensure the Liveblocks room exists (create only if needed)
4. Return a session token with:
    - User name
    - Avatar
    - Generated cursor color

Return `403` for unathorized project access.

## Dependencies
All required Liveblocks packages are already installed.

## Check When Done
- `liveblocks.config.ts` defines Presence and UserMeta
- Liveblocks client is cached
- Auth route verifies project access
- User metadata is attached to sessions
- `npm run build` passes