Add resizing and inline label editing to canvas nodes.

## Implementation
1. Add resizing.
    - Selected nodes should show resize handles
    - Prevent nodes from being resized below a minimum size
    - Keep resize handles subtle and consistent with the dark canvas UI
2. Add inline label editing.
    - Keep the node label centered inside the node
    - Double-click the center/label area of a node to edit its label
    - Show placeholder text in the same centered position when the label is empty
    - Keep editing smooth without causing layout shifts
    - Show a textarea directly over the label while editing
    - Update the label as users type
    - Close editing on blur or `Escape`
    - Prevent text editing interactions from dragging or panning the canvas
3. Keep all node updates connected to the existing collaborative canvas state.

## Scope Limits
- Don't change shape rendering from the previous unit
- Don't change the shape panel or drag preview
- Don't change how dropped nodes are created
- Keep this focused on resize and label editing only

## Check When Done
- Selected nodes show resize handles
- Resizing updates node dimensions through the existing node state flow
- Double-clicking a node opens inline label editing
- Label editing updates node labels through the existing sync flow
- Editing closes on blur or `Escape`
- Text interactions do not trigger canvas drag or pan
- `npm run build` passes without type errors
