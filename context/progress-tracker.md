# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature 07 (Wire Editor Home)

## Current Goal

- Feature 07 editor home API wiring is implemented and verified.

## Completed

- `context/feature-specs/01-design-system.md`
- `context/feature-specs/02-editor.md`
- `context/feature-specs/03-auth.md`
- `context/feature-specs/04-project-dialogues.md`
- `context/feature-specs/05-prisma.md`
- `context/feature-specs/06-project-apis.md`
- `context/feature-specs/07-wire-editor-home.md`

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
