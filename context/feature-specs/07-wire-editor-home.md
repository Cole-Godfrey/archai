Wire the editor home sidebar and dialogs to the real project API.

### Data Fetching
The editor home page is a server component.

Fetch owned and shared projects server-side using the existing project data helper and pass both lists to the sidebar.

No client-side fetching for initial load.

### `Use Project Actions`
Create a hook in `hooks/` that manages dialog state and project mutations.

**Create:**
- Manage create dialog state
- Manage project name input
- Generate a short unique suffix
- Slugify the name to create the room ID
- Call `POST /api/projects`
- Navigate to the new workspace

The project ID and Liveblocks room ID should stay aligned.

**Rename:**
- Store target project id + current name
- Call `PATCH /api/projects/[id]`
- Refresh on success

**Delete:**
- Store target project
- Call `DELETE /api/projects/[id]`
- Redirect to `/editor` if deleting the active workspace
- Otherwise refresh

### Wiring
Connect the hook to the sidebar and dialogs.
- Create dialog shows room ID preview
- Rename dialog pre-fills current name
- Delete dialog shows project name

### Check When Done
- Sidebar uses real project data
- Create navigates to workspace
- Rename updates correctly
- Delete refreshes or redirects correctly
- `npm run build` passes