# Archai

A real-time collaborative system design workspace. Describe a system in plain English, let an AI agent map it onto a shared canvas, refine the architecture with collaborators, and generate a Markdown technical spec from the resulting graph.

## Features

- Shared real-time canvas with live cursors and presence, built on Liveblocks and React Flow
- AI generation that turns a natural-language prompt into nodes and edges in the shared room
- Prebuilt starter templates (monolith, microservices, event-driven, serverless, and more)
- Markdown spec generation from the current canvas graph, persisted and downloadable
- Clerk-backed sign-in, project ownership, and collaborator access

## Stack

| Layer            | Technology                       |
| ---------------- | -------------------------------- |
| Framework        | Next.js 16 + TypeScript          |
| UI               | Tailwind CSS + shadcn/ui         |
| Auth             | Clerk                            |
| Database         | Prisma + PostgreSQL              |
| Canvas           | Liveblocks + React Flow          |
| Background tasks | Trigger.dev                      |
| AI               | Vercel AI SDK (OpenAI Responses) |
| Artifact storage | Vercel Blob                      |

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env` file with:

```bash
DATABASE_URL=                        # PostgreSQL connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=   # Clerk
CLERK_SECRET_KEY=
LIVEBLOCKS_SECRET_KEY=               # Liveblocks
TRIGGER_PROJECT_REF=                 # Trigger.dev
TRIGGER_SECRET_KEY=
OPENAI_API_KEY=                      # AI generation
OPENAI_AI_MODEL=                     # optional, defaults to gpt-5.5
BLOB_READ_WRITE_TOKEN=               # Vercel Blob
```

Set up the database:

```bash
npx prisma migrate dev
```

Run the app:

```bash
npm run dev          # Next.js dev server at http://localhost:3000
npm run trigger:dev  # Trigger.dev dev server (separate terminal, required for AI tasks)
```

## Project Structure

- `app/`: routes and authenticated API handlers
- `trigger/`: background jobs for AI design and spec generation
- `components/`: canvas surfaces, sidebars, dialogs, and UI
- `lib/`: Prisma client, access control helpers, AI provider, utilities
- `prisma/`: database schema and migrations
- `context/`: project docs covering overview, architecture, standards, and progress

See `context/architecture-context.md` for system boundaries, the storage model, and invariants.
