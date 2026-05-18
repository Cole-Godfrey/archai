## Goal
Build the `/editor` home screen and add project dialogues/sidebar actions. No API calls or persistence yet.

## Editor Home

Reuse the existing editor layout. Do not modify the navbar or sidebar behavior.

In the center of the page, add
- Heading: `Create a project or open an existing one`
- Description: `Start a new architecture workspace, or choose a project from the sidebar.`
- `New Project` button with a `Plus` icon

Keep the layout minimal. Do not wrap this content in the cards.

Clicking `New Project` should open the Create Project dialog.

## Dialogues
### Create Project
- Project name input
- Live slug preview based on the name
- Preview updates as the user types

### Rename Project
- Prefilled project name input
- Current project name shown in the description
- Input auto-focuses
- Enter submits

### Delete Project
- Destructive confirmation only
- No input
- Confirm button uses destructive styling

## Sidebar
Add project item actions:
- Rename
- Delete

Show actions only for owned projects.

Hid actions for shared/collaborator projects.

On mobile:
- Tapping outside the sidebar closes it
- Add a backdrop scrim

## Implementation
Create a dedicated hook to manage:
- Dialogue state
- Form state
- Loading state

Wire:
- Editor home `New Project` → Create dialogue
- Sidebar create → Create dialogue
- Sidebar rename → Rename dialogue
- Sidebar delete → Delete dialogue

Use mock project data only. Do not add API calls or persistence.

## Check When Done
- Sidebar actions are wired
- Slug preview works
- No TypeScript errors
- No lint errors