Replace the placeholder node renderer with proper rendering and a drag preview.

## Implementation
1. Replace the placeholder node shape rendering.
    - Rectangle, pill, and circle should use CSS styling
    - Diamond, hexagon, and cylinder should render with SVG shapes
    - SVG shapes should scale with node size
    - Keep borders subtle at rest and brighter when selected
2. Add a shape drag preview.
    - When dragging a shape from the shape panel, show a ghost preview of that shape
    - Keep the preview attached to the cursor while dragging
    - Use the same shape type and default size that will be used on drop
    - Hide the preview after the shape is dropped or the drag is cancelled
    - Keep this limited to drag preview behavior only
3. Keep node rendering connected to the existing collaborative canvas state.

## Scope Limits
- Don't rebuild shape panel layout
- Don't change how dropped nodes are created
- Don't add resize or label editing yet
- Keep drag/drop changes limited to the ghost preview only

## Check When Done
- Nodes render the correct shape variant for each type
- CSS shapes render correctly for rectangle, pill, and circle
- SVG shapes render and scale correctly for diamond, hexagon, and cylinder
- Shape dragging shows a ghost preview matching the dragged shape
- `npm run build` passes without type errors