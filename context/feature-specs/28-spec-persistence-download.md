Persist generated specs with Vercel Blob and Prisma, then add a secure download route so users can retrieve their generated spec files.

### Implementation
1. ProjectSpec model
    
Ensure a `ProjectSpec` Prisma model exists with:
- `id`
- `projectId` (relation to project)
- `filePath` (Blob URL or path)
- `createdAt`

Use this model for metadata only. The actual spec content should live in Vercel Blob.

2. Save generated spec

After a spec is generated:
- Upload the Markdown content to Vercel Blob
- Store the Blob URL/path in `ProjectSpec.filePath`
- Link the record to the correct project
- Follow the same metadata and Blob pattern used for canvas persistence

3. Download route

Create a route like: `GET /api/projects/[projectId]/specs/[specId]/download`

It should:
- Authenticate the user
- Verify access to the project
- Verify the spec belongs to that project
- Fetch the file using `ProjectSpec.filePath`
- Return it as a downloadable Markdown file
- Handle not found and forbidden cases properly

### Scope Limits
- Do not add frontend or UI logic
- Do not store spec content in Prisma
- Do not expose Blob URLs without access checks
- Do not modify existing canvas persistence

### Notes
- Check `context/project-overview.md` and `context/architecture-context.md` first
- Reuse existing project access patterns
- Prisma stores metadata, Vercel Blob stores content

### Check When Done
- `ProjectSpec` model exists with required fields
- Spec is uploaded to Vercel Blob
- `filePath` is saved correctly
- Download route validates access before returning file
- Response is a Markdown attachment
- TypeScript and build pass
    
    