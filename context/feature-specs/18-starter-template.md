Add a small starter template library so users can start a canvas from a pre-built diagram instead of building from scratch.

## Implementation
1. Create `components/editor/starter-templates.ts`.

    Include:
    - A `CanvasTemplate` type
    - A `CANVAS_TEMPLATES` array
    - At least three templates, such as microservices, CI/CD pipeline, and event-driven system

    Each template should include:
    - `id`
    - `name`
    - `description`
    - nodes
    - edges

    Use the shared canvas types and existing node color palette. Add small helper functions if needed to keep the template data readable.
2. Create `components/editor/starter-templates-modal`.
    The modal should:
    - Open as a dialog
    - Show template cards in a scrollable grid
    - Show the template name and description
    - Include an import button for each template
    - call `onImport` with the selected template, then close

3. Add a simple diagram preview to each template card:
    - Fit the preview to a fixed-size viewport
    - Calculate the preview bounds from the template node positions
    - Draw edges as simple lines between node centers
    - Draws nodes using their shape and color data
    - Keep the preview lightweight, no React Flow instance needed
4. Wire starter templates into the editor:
    - Add a navbar button to open the starter templates modal
    - When a template is selected, clear all existing nodes and edges first in the canvas
    - Add the selected template nodes and edges after the canvas is cleared
    - Make sure the starter template replaces the current canvas instead of being added on top of existing work
    - Fit the view after the template is loaded
    - Keep this inside the existing collaborative canvas state

## Scope Limits
- Don't add template saving yet
- Don't add custom user templates
- Don't add server persistence
- Don't change node or edge rendering behavior
- Keep this focused on importing predefined templates

## Check When Done
- Template data is defined using shared canvas types
- Import modal renders template cards with previews
- Import action replaces the current canvas through the existing node and edge state flow
- Editor navbar includes the import entry point
- `npm run build` passes