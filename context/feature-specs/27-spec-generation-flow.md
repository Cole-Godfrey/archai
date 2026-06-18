Create the backend flow for AI-powered spec generation: API route, Trigger.dev task, token route, and run ownership tracking.

### Implementation

1. Spec trigger route

Create or update `POST /api/ai/spec`.

It should:

- Accept `roomId`, `chatHistory`, `nodes`, and `edges`
- Authenticate the current user
- Resolve project access from `roomId`
- Trigger the `generate-spec` task
- Save a `TaskRun` record for ownership/access control
- Return the Trigger.dev `runId`

Do not trust a client-supplied `projectId`.

2. Spec token route

Create or update `POST /api/ai/spec/token`.

It should:

- Accept `runId`
- Authenticate the current user
- Verify the `TaskRun` belongs to the user
- Issue a Trigger.dev public access token scoped to that run
- Set token expiration to 1 hour
- Return the token to the client

3. Spec generation task

Create or update `trigger/generate-spec.ts`.
Define a `generateSpec` task that:

- Accepts `projectId`, `roomId`, `chatHistory`, `nodes`, and `edges`
- Validates input with Zod
- Uses Gemini through `@ai-sdk/google`
- Generates a Markdown technical spec from the canvas and chat context
- Updates run metadata/status for realtime tracking
- Returns the generated spec content as task output

Follow the existing Trigger.dev task patterns in the codebase for retries, logging, and error handling.

### Scope Limits

- Do not add frontend logic
- Do not create a spec editor UI
- Do not store the final spec in this unit
- Do not derive access from client-provided project IDs
- Do not create a new AI provider abstraction
- Do not change existing canvas or chat data models

### Notes

- Check `context/project-overview.md` and `context/architecture-context.md` for system alignment before implementing
- Use Zod for request/task input validation
- Use Prisma for `TaskRun` persistence
- Project access must come from the authenticated user + `roomId`
- Keep the task output as plain Markdown
- Reuse existing auth, Prisma, Trigger.dev, and Gemini patterns

### Check When Done

- `POST /api/ai/spec` validates input and returns a `runId`
- A `TaskRun` record is created for the authenticated user
- `POST /api/ai/spec/token` only returns a token for the run owner
- `generate-spec` runs through Trigger.dev and returns Markdown output
- TypeScript and build pass
