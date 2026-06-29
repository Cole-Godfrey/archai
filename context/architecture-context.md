# Architecture Context

## Stack

| Layer            | Technology              | Role                                                           |
| ---------------- | ----------------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript | Full-stack app with server/client boundaries                   |
| UI               | Tailwind + shadcn/ui    | Component composition and styling                              |
| Auth             | Clerk                   | User identity and route protection                             |
| Database         | Prisma + PostgreSQL     | Relational metadata: projects, collaborators, specs, task runs |
| Canvas           | Liveblocks + React Flow | Real-time collaborative canvas, presence, and cursors          |
| Background tasks | Trigger.dev             | Durable AI generation workflows                                |
| Artifact storage | Vercel Blob             | Canvas snapshots and generated Markdown specs                  |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `prisma` — Database schema and generated client output.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

- **Database**: metadata, ownership, relationships, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` and specs at `specs/{projectId}/{specId}.md`.
- Project records, spec records, and task run records belong in PostgreSQL.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `filePath`) as the reference to the artifact.

## Auth and Collaboration Model

- Every project has a single owner (Clerk user ID).
- Projects can include additional collaborators.
- Only authenticated users can access protected routes.
- Only the owner or a collaborator can mutate project resources.
- Liveblocks room tokens are issued only after verifying project membership; verified members are granted room write plus `feeds:write` so they can read and write the room's shared AI status feed.
- Project IDs are used as Liveblocks room IDs for editor workspaces.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

- Provider: design and spec generation use the shared `lib/ai-provider.ts` helper. The current live-test target is Anthropic through `@ai-sdk/anthropic`, defaulting to `claude-opus-4-7` with `effort: "max"`; `ANTHROPIC_API_KEY` is required and `ANTHROPIC_AI_MODEL` can override the model id. `@ai-sdk/openai` remains installed only for the ordered fallback test path. Strict structured-output schemas must not use optional object properties; optional design-action semantics are represented as required nullable fields and interpreted as `null` meaning "use the default / leave unchanged / auto-route."

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev.
- Output: structured node and edge updates written into the shared Liveblocks room.

### Spec Generation

- Input: current canvas graph and project context.
- Execution: durable background task via Trigger.dev.
- Output: Markdown spec content saved to Vercel Blob (`specs/{projectId}/{specId}.md`) and linked to the project via a `ProjectSpec` record in the database. The task returns `{ specId, markdown }`.
- Triggering: the editor Specs tab sends the current React Flow nodes/edges plus validated AI chat feed entries to `POST /api/ai/spec`, obtains a run-scoped token from `POST /api/ai/spec/token`, tracks completion with Trigger.dev React hooks, and reloads the metadata list when the task finishes successfully.
- Listing: `GET /api/projects/[projectId]/specs` authenticates the user, verifies project access, and returns `ProjectSpec` metadata only (`id`, `createdAt`, project-name-derived `filename`) without exposing Blob URLs. The visible filename uses the same slugging helper as the download attachment name.
- Download: `GET /api/projects/[projectId]/specs/[specId]/download` returns the saved spec as a Markdown attachment after verifying authentication, project access, and that the spec belongs to the project.
- Preview: the editor Specs tab fetches Markdown content through the same authenticated download endpoint and renders it in a modal; clients never fetch Blob URLs directly.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
