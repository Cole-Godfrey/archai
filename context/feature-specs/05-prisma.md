Prisma is already installed. Add the project data models, Prisma client singleton, and first migration.

## Models
Create `prisma/models/project.prisma`.

Add `Project`:
- Owner ID mapped to Clerk user
- Name
- Optional description
- Status enum: `DRAFT`, `ARCHIVED`
- `canvasJsonPath` for future canvas blob storage
- Timestamps
- Indexes on owner ID and creation date

Add `Project Collaborator`:
- Project relation with cascade delete
- Collaborator email
- Creation timestamp
- Unique constraint on project/email
- Indexes on email and project/date

Do not add extra fields unless required by Prisma.

## Prisma Client
Create `lib/prisma.ts` as a cached singleton.

Branch by `DATABASE_URL`:
- If it starts with `prisma+postgres://`, use Accelerate
- Otherwise use direct `@prisma/adapter-pg`

Cache the cleint on `global` in development for hot reloads.

## Migration
Run the migration and generate the client.

## Dependencies
Already installed:
- `prisma`
- `@prisma/client`
- `@prisma/adapter-pg`
- `pg`

## Check When Done
- Schema has both models with correct relations and indexes
- `lib/prisma.ts` exports one cached Prisma instance
- Migration runs successfully
- `npm run build` passes