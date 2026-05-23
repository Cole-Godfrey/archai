Build the `/editor/[roomId]` workspace shell with server-side access checks. No canvas logic yet.

## Access
`/editor/[roomId]` must be a server component.

Before rendering:
- Unauthenticated users redirect to `/sign-in`
- Users without project access see `AccessDenied`
- Non-existent projects also show `AccessDenied`

Create `components/editor/access-denied.tsx` with:
- Centered layout
- Lock icon
- Short message
- Link back to `/editor`

## Access Helpers
Create `lib/project-access.ts` with helpers for:
- Getting current Clerk identity: `userId` + primary email
- Checking project access by owner or collaborator

## Layout
Build a full-viewport workspace layout with:
- Top navbar showing the project name
- Navbar actions: share button and AI sidebar toggle
- Existing `ProjectSidebar` on the left
- Current room highlighted in the sidebar
- Central canvas placeholder with dark background and centered message
- Right sidebar placeholder for future AI chat

The canvas area should fill the remaining space.

## Scope
Do not add real canvas logic, Liveblocks, AI chat, or sharing behavior yet.

## Check When Done
- `/editor/[roomId]` builds successfully
- Access helper exists outside the page component
- `AccessDenied` is used for missing or unauthorized projects
- Workspace layout renders with current project context
- No TypeScript errors
