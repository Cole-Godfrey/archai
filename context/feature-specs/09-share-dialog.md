Add a `Share` button to the editor navbar that opens the share dialog.

The access list should include the project owner and current collaborators.

Owners can:
- Invite collaborators by email
- View current collaborators and the project owner
- Remove collaborators
- Copy the project link with temporary `Copied!` feedback
- Not invite any email address that belongs to the project owner's Clerk account

Collaborators can:
- View the owner and collaborator list only
- Not invite, remove, or manage access

## Clerk User Data
Collaborators are stored by email in the database.

Use Clerk Backend API to enrich collaborator emails with:
- Display name
- Avatar image

If a Clerk user is not found for an email, fall back to showing the email only.

If the owner cannot be resolved from Clerk, show a generic owner label. Do not
expose the internal Clerk owner ID in the share dialog API payload.

## Implementation
Add the required API logic for:
- Listing collaborators
- Inviting collaborators
- Removing collaborators

Enforce ownership server-side for invite and remove actions.

Do not add a local user table.

## Check When Done
- Share dialog opens from the workspace
- Owners can invite and remove collaborators
- Collaborators see read-only access
- Collaborator names/avatars load from Clerk when available
- `npm run build` passes
