Add autosave and loading for the collaborative canvas so the project state is persisted before adding AI generation. Canvas JSON should be stored in Vercel Blob, and the saved blob URL should be stored on the Prisma project record.

## What to Install:
- `@vercel/blob`

## Implementation
1. Check the existing project schema:
    - Review `prisma/model/project.prisma`
    - Add or reuse a field for the canvas blob URL
    - Keep Prisma responsible for metadata only 
2. Add canvas save/load API routes.
    Create `PUT /api/projects/[projectId]/canvas`.
    This route should:
    - Receive the latest canvas JSON
    - Upload the JSON to Vercel Blob
    - Store the returned blob URL on the matching Prisma project record
    
    Create: `GET /api/projects/[projectId]/canvas`.
    This route should:
    - Read the project's saved blob URL from Prisma
    - Fetch the saved canvas JSON from Vercel Blob
    - Return the canvas state to the editor
3. Add an autosave hook in the `/hooks` folder:
    - Watch the canvas nodes and edges
    - Debounce saves to avoid excessive writes
    - Save through the canvas API route
    - Track save status: saving, saved, error
4. Load saved canvas state in the editor:
    - When the editor loads, check if the Liveblocks room has any existing nodes or edges
    - If the room is empty and the project has a saved canvas blob URL, fetch and load the saved canvas state
    - If the room already has nodes or edges, skip the load entirely to avoid overwriting active collaboration
5. Add a small save indicator in the editor Save button
    - Show saving, saved, or error states

## Storage Pattern
- Prisma stores project metadata and the canvas blob URL
- Vercel Blob stores the actual canvas JSON

## Check When Done
- `@vercel/blob` is installed
- Project schema supports storing the canvas blob URL
- Save/load routes use Prisma for metadata and Vercel Blob for canvas JSON
- Autosave hook debounces canvas saves
- Editor shows save status
- Saved canvas does not load if the room already has active nodes or edges
- `npm run build` passes
