Implement the full AI design agent so a user prompt results in real-time updates on the collaborative canvas, with visible AI presence and status.

## Implementation

1. Update the design agent task in `trigger/design-agent.ts`.

   Before implementing:
    - Check `context/project-overview.md` and `context/architecture-context.md` for product behavior and system rules
    - Before implementing, check Liveblocks and Trigger.dev agent skills for current patterns on canvas mutation and background task execution.
    - Follow the existing Trigger.dev setup and agent patterns already in the project
    - Reuse existing Liveblocks flow and presence patterns instead of creating new ones

   Then implement:
    - Use Gemini (`@ai-sdk/google`) to interpret the user prompt
    - Update the canvas using the existing collaborative flow utilities
    - Support actions like:
        - Add node
        - Move node
        - Resize node
        - Update node data
        - Delete node
        - Add edge
        - Delete edge
    - Publish AI activity to the shared status feed so all users see progress
    - Update AI presence (cursor and thinking state) while the task runs
    - Push clear status messages at key steps (start, processing, complete)

    - Ensure generated designs follow:
        - Allowed node shapes
        - Color palette
        - Layout and spacing rules

    - Handle errors gracefully and update the status if something fails
    - Clear AI presence when the task finishes

## Dependencies

All packages are already installed.`GOOGLE_AI_API_KEY` is already in `.env.local`.

## Scope Limits

- Don’t change canvas architecture
- Don’t introduce a new state system outside Liveblocks
- Don’t bypass existing collaborative flow utilities

## Check When Done

- Design task updates the canvas through the existing collaborative flow
- AI presence and status are visible to all participants
- Status messages reflect task progress
- Errors are handled without breaking the canvas
- `npm run build` passes
