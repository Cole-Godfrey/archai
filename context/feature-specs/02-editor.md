We need the base chrome components that frame every editor screen, the top navbar and the left sidebar shell. These will be reused and extended in every chapter that follows.

### Editor Navbar
Create `components/editor/editor-navbar.tsx`.

Requirements:
- Fixed-height top navbar
- Left, center, and right sections
- Left section contains sidebar toggle button
- Use `PanelLeftOpen` / `PanelLeftClosed` icons based on sidebar state
- Right section stays empty for now
- Dark background with subtle bottom border

### Project Sidebar
Create `components/editor/project-sidebar.tsx`.

Requirements:
- Sidebar should float above the editor canvas
- Opening it should not push page content
- Slides in from the left
- Accepts `isOpen` prop
- Header with `Projects` title + close button
- Shadcn `Tabs`:
    - My Projects
    - Shared
- Both tabs show empty placeholder state
- Full-width `New Project` button at the bottom with `Plus` icon

### Dialog Pattern
Use the existing color tokens from `globals.css` for dialog styling.

Support:
- Title
- Description
- Footer Actions

Do not build actual dialogs yet.

### Check When Done
- New components compile without TypeScript errors
- No lint errors
- Dialog pattern is ready for future use
