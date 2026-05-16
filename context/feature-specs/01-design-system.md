Read `AGENTS.md` before starting.

We are adding the design system and UI primitive components.

Install and configure `shadcn/ui`.

Add these shadcn components:
- Button
- Card
- Dialog
- Input
- Tabs
- TextArea
- ScrollArea

Do not modify the generated `components/ui/*` files after installation.

Also install `lucide-react`.

Create `lib/utils.ts` with a reusable `cn()` helper for merging Tailwind classes.

Ensure all components match teh existing dark theme in `globals.css`.

### Check When Done
- All components import without errors
- `cn()` works properly
- No default light styling appears
