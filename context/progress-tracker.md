# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Authentication

## Current Goal

- `context/feature-specs/03-auth.md` is implemented and verified.

## Completed

- `context/feature-specs/01-design-system.md`
- `context/feature-specs/02-editor.md`
- `context/feature-specs/03-auth.md`

## In Progress

- None.

## Next Up

- Select and start the next feature spec.

## Open Questions

- None.

## Architecture Decisions

- shadcn/ui is configured with generated primitives in `components/ui/*`; project-specific theming lives in `app/globals.css`.
- Clerk public auth paths are derived from the standard `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` env vars, with `/sign-in` and `/sign-up` as local route fallbacks.

## Session Notes

- Feature specs 01, 02, and 03 have been implemented and verified with lint, TypeScript, production build, and auth-route checks.
