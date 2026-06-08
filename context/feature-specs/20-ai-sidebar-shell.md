Complete the existing AI sidebar placeholder and turn it into a proper floating chat sidebar component. The sidebar already exists, so keep the current placement. This unit is focused on building out the sidebar UI inside it, as well as improving the slide animation.

## Implementation
1. Separate the AI sidebar into its own component:
    - Keep the open/close state controlled by the parent
    - Improve the slide animation to have smooth slide-in behavior from the right side, and it should look more like it is floating, similar to the projects' sidebar.
    - You may modify border, background, and shadow styling, but ensure it aligns with `context/ui-context.md`, and preserve the current floating position.
    - Use sidebar surface styles like `bg-base/95`, `border-surface-border`
2. Add the sidebar header:
    - Title: `AI Workspace`
    - Subtitle: `Collaborate with AI`
    - Small bot icon
    - Close button aligned to the right
    - Use `text-primary-text` for the title
    - Use `text-muted-text` for the subtitle
3. Add a tabbed layout with two tabs.
    Use shadcn `Tabs`:
    - `AI Architect`
    - `Specs`
    - Active tab should use the accent styling, like `bg-accent`, and `text-accent`
    - Inactive tab text should stay muted with `text-muted-text`
4. Build the AI Architect tab.
    Use shadcn components where they fit, especially `Button` and `Textarea`:
    - Scrollable chat area
    - Empty state with bot icon, short description, and starter prompt chips
    - Starter chips:
        - `Design an e-commerce backend`
        - `Create a chat app architecture`
        - `Build a CI/CD pipeline`
    - Style starter chips as soft pills using `bg-subtle` and `text-accent-text`
    - User messages should be right-aligned with `bg-brand-dim border-brand/50 border-2 text-copy-primary`
    - Assistant messages should be left-aligned with `bg-elevated border border-surface-border text-accent-text`
    - Input area with an auto-resizing textarea, around 72 px min height and 160 px max height
    - Send button should use `bg-accent`
    - `Enter` submits, `Shift+Enter` adds a newline
5. Build the Specs tab:
    - Show a `Generate Spec` button using `bg-accent`
    - Show a demo spec card for now
    - Style the card with `bg-elevated` and `border-surface-border`
    - Include a file/spec icon, title, short snippet, and disabled download action
6. Use the existing project color tokens.
    Check `globals.css`, `ui-context.md` or the Tailwind mapping before adding direct color values. Avoid inventing new colors if a matching token already exists.

## Scope Limits
- Don't add backend logic
- Don't add Liveblocks or AI generation logic yet
- Keep this focused on the sidebar UI structure, styling, and animations

## Check When Done
- AI sidebar is separated into its own component
- AI sidebar has floating slide-in behavior
- Sidebar includes AI Architect and Specs tabs
- AI Architect tab has empty state, starter chips, and input UI
- The Specs tab has a Generate button and a static demo spec card
- `npm run build` passes