# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature 12 (Shape Panel)

## Current Goal

- Feature 12 shape panel is implemented and verified.

## Completed

- `context/feature-specs/01-design-system.md`
- `context/feature-specs/02-editor.md`
- `context/feature-specs/03-auth.md`
- `context/feature-specs/04-project-dialogues.md`
- `context/feature-specs/05-prisma.md`
- `context/feature-specs/06-project-apis.md`
- `context/feature-specs/07-wire-editor-home.md`
- `context/feature-specs/08-editor-workspace-shell.md`
- `context/feature-specs/09-share-dialog.md`
- `context/feature-specs/10-liveblocks-setup.md`
- `context/feature-specs/11-base-canvas.md`
- `context/feature-specs/12-shape-panel.md`

## In Progress

- None.

## Next Up

- None.

## Open Questions

- None.

## Architecture Decisions

- shadcn/ui is configured with generated primitives in `components/ui/*`; project-specific theming lives in `app/globals.css`.
- Clerk public auth paths are derived from the standard `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` env vars, with `/sign-in` and `/sign-up` as local route fallbacks.
- Project API routes perform their own Clerk auth checks so unauthenticated API requests can return JSON `401` responses instead of `auth.protect()` API `404` responses.
- Project workspace access checks are centralized in `lib/project-access.ts`; `/editor/[roomId]` treats room IDs as project IDs.
- Editor pages perform server-component auth redirects to `/sign-in`; proxy-level Clerk protection is skipped for `/editor` routes so page-level access handling can render `AccessDenied` for missing or unauthorized projects.
- Project collaborator records remain email-only in PostgreSQL; share-dialog display names and avatars are enriched at request time from Clerk Backend API with email-only fallback.
- Share-dialog access lists include the project owner derived from `Project.ownerId`; owners are not stored as collaborator rows.
- Share-dialog API payloads do not expose `Project.ownerId` as a contact field; unresolved owners render with a generic owner label.
- Share-dialog owner invite prevention compares invite emails against every normalized email address on the owner's Clerk account, with the signed-in primary email retained as a fallback.
- Liveblocks auth uses private project rooms and issues room-scoped access tokens only after Clerk authentication and project membership verification.
- Liveblocks user metadata uses Clerk display data plus a deterministic Archai cursor color derived from the Clerk user ID.

## Session Notes

- Started feature spec 06 backend project API route implementation.
- Added backend REST routes for project list, create, rename, and delete, with owner-scoped Prisma mutations.
- Feature spec 06 has been verified with lint, production build, and an unauthenticated API smoke check returning JSON `401`.
- Started feature spec 05 Prisma data layer implementation.
- Added the initial Project and ProjectCollaborator Prisma models plus the cached Prisma client singleton.
- Applied the first Prisma migration and generated the Prisma Client for the project models.
- Feature spec 05 has been verified with Prisma schema validation and production build.
- Feature specs 01, 02, and 03 have been implemented and verified with lint, TypeScript, production build, and auth-route checks.
- Started feature spec 04 project dialogues.
- Implemented the editor home screen, mock project sidebar actions, and project dialogue state/components for feature spec 04.
- Feature spec 04 has been verified with lint, TypeScript, and production build.
- Started a project creation slug validation fix for names that slugify to an empty value.
- Project creation now requires a non-empty generated slug; the fix was verified with lint, TypeScript, and production build.
- Started follow-up cleanup to apply slug validation to rename and simplify slug preview display.
- Rename now also requires a non-empty generated slug, and create/rename slug previews render as plain text below the input with blank output for empty slugs; verified with lint, TypeScript, production build, and diff whitespace checks.
- Started feature spec 07 wiring of the editor home sidebar and project dialogs to the real project API.
- Implemented feature spec 07 server-side project loading, real sidebar data, API-backed create/rename/delete dialog actions, and project ID/room ID alignment for new workspaces.
- Feature spec 07 has been verified with lint and production build.
- Documented the project ID and Liveblocks room ID alignment invariant in `context/architecture-context.md`.
- Adjusted the create project slug preview to show only the generated slug without a `Room ID` label.
- Fixed the PostgreSQL SSL mode warning by changing local `DATABASE_URL` values from `sslmode=require` to `sslmode=verify-full`.
- Marked the SSL mode warning entry resolved in `context/current-issues.md`.
- Wrapped editor home project create, rename, and delete API calls in request failure handling so fetch/read errors surface in dialogs and loading state clears without resetting successful navigation state.
- Project action request failure handling was verified with lint and production build.
- Started feature spec 08 editor workspace shell implementation.
- Added server-side `/editor/[roomId]` access checks, shared project access helpers, the `AccessDenied` state, and the workspace shell placeholders for canvas and Archai assistant.
- Moved editor route auth handling from proxy protection into editor server components so unauthenticated workspace requests redirect to `/sign-in`.
- Feature spec 08 has been verified with lint, production build, and an unauthenticated `/editor/nonexistent` smoke check returning `307` to `/sign-in`.
- Updated the workspace navbar AI sidebar toggle to use the same sparkles icon as the assistant chat header.
- Started feature spec 09 share dialog implementation.
- Added the project collaborators API route for list, invite, and remove operations with owner-only invite/remove enforcement and Clerk user enrichment for collaborator display data.
- Added the workspace share dialog, enabled the navbar Share button, and wired owner invite/remove/copy-link controls plus collaborator read-only list rendering.
- Feature spec 09 has been verified with lint, production build, and an unauthenticated collaborators API smoke check returning JSON `401`.
- Started follow-up fix for Feature 09 to include the project owner in the share dialog access list.
- Updated the collaborators API payload to include an owner row enriched from Clerk by owner user ID and marked as non-removable in the share dialog.
- Feature 09 owner access-list fix has been verified with lint and production build.
- Started follow-up privacy fix to avoid returning internal owner IDs in share dialog contact fields.
- Owner rows now use `email: null` and a generic `Project owner` display fallback when Clerk cannot resolve the owner; verified with lint and production build.
- Started follow-up fix to prevent owners from inviting alternate emails on their own Clerk account as collaborators.
- Owner invite prevention now blocks every normalized email on the owner's Clerk account, with the signed-in primary email as a fallback; verified with lint, production build, and diff whitespace checks.
- Started feature spec 10 Liveblocks setup implementation.
- Added the Liveblocks global type config for cursor presence, thinking state, and user metadata.
- Added the cached Liveblocks node client, deterministic cursor color helper, and Clerk-protected `/api/liveblocks-auth` route.
- Added the missing `@liveblocks/node` dependency required by the auth route.
- Feature spec 10 has been verified with lint and production build.
- Started feature spec 11 base canvas implementation.
- Added shared canvas node/edge types, Liveblocks storage typing, and a Liveblocks-backed React Flow canvas wrapper.
- Replaced the workspace canvas placeholder with the base collaborative canvas.
- Feature spec 11 has been verified with lint and production build.
- Started feature spec 12 shape panel implementation.
- Added the bottom floating shape panel with draggable shape icon buttons and typed drag payloads containing shape and default size data.
- Added canvas dragover/drop handling that converts screen coordinates through React Flow and creates Liveblocks-synced `canvasNode` nodes with generated shape/timestamp/counter IDs.
- Added the basic custom `canvasNode` renderer so newly dropped nodes are visible as bordered rectangles with centered labels.
- Feature spec 12 has been verified with production build and lint.
- Removed visible button boxes from the shape panel controls and changed shape dragging to use an icon-only drag preview; verified with lint and production build.
- Restored shape control chrome for hover and active drag states, switched the drag preview to a chromed button preview, reduced default dropped shape sizes, and enlarged the canvas dot grid spacing; verified with lint and production build.
- Prevented empty rooms from auto-centering on the first manually dropped shape while retaining initial fit behavior for rooms that already load with nodes; verified with lint and production build.
