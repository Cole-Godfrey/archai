Integrate spec generation results into the editor so users can view, preview, and download specs from the existing AI sidebar specs tab.

### Implementation
1. Spec List
- In the right sidebar (Spec tab), show a list of specs for the current project
- Fetch specs from the backend using the existing ProjectSpec API
- display:
    - createdAt
    - filename
- Keep items simple and clickable

2. Preview Modal
- Open a modal when a spec is selected
- Fetch the spec content through an existing endpoint (do not access Blob directly from the client)
- Render content as Markdown
- Include a close action and basic keyboard support

3. Download Action
- Add a download action for each spec (list item and modal)
- Call the download endpoint
- Let the browser handle the file download

### UI Details
- Use existing sidebar layout, do not redesign
- Use shadcn/ui components (Dialog, ScrollArea, Button)
- Use existing colors and tokens from `globals.css`
- Follow `ui-context.md` for spacing and layout
- Keep the list compact and scrollable

### Scope Limits
- Do not implement backend logic
- Do not fetch Blob URLs directly in the client
- Do not store spec content in the frontend state long-term
- Do not redesign the sidebar or tabs
- Do not add a new global state

### Notes
- Reuse existing fetch patterns used in the app
- Assume ProjectSpec only provides metadata; content must be fetched separately

### Check When Done
- Spec list loads for the current project
- Modal shows rendered Markdown content
- Download action triggers file download
- TypeScript and build pass