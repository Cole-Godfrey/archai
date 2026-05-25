Replace the default canvas edges with custom edges that feel easier to follow, easier to click, and support inline labels.

## Implementation
1. Add connection handles to every node:
    - Place handles on the top, right, bottom, and left sides
    - Users should be able to connect from any handle to any other handle
    - Keep the handles subtle: small white dots with a dark border
    - Hide them by default and fade them in when hovering the node
2. Add a default style for new edges:
    - Use a light stroke with rounded ends
    - Add an arrowhead at the end of each edge
    - Make new connections use the custom canvas edge renderer
3. Create the custom edge renderer:
    - Use clean right-angle routing
    - Keep edges slightly dimmed at rest
    - Brighten edges when hovered or selected
    - Make edges easier to hover and click without increasing the visible line thickness
4. Add inline edge editing:
    - Double-click an edge to edit its label
    - Use React Flow's `EdgeLabelRenderer` and the path midpoint coordinates from `getSmoothStepPath` to position the label - do not calculate midpoint position manually
    - Use an input that grows with the label text
    - Save the label on blur, Enter, or Escape
    - Show saved labels as small pill badges
    - When an active edge has no label, show a faint hint
    - Prevent label clicks and typing from dragging or panning the canvas
    - Update labels through the existing collaborative edge data flow

## Scope Limits
- Don't change how nodes are created
- Don't change the shape panel
- Don't redesign the node renderer beyond the required connection handles
- Keep this focused on edge rendering, labels, and connection behavior

## Check When Done
- Nodes have handles on all four sides
- New edges use the custom canvas edge type with arrows
- Edge hover, selection, and label editing are handled in the custom edge renderer
- Edge label position uses EdgeLabelRenderer and path midpoint coordinates
- Edge labels update through the existing edge data flow
- `npm run build` passes without type errors