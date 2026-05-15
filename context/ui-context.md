# UI Context

## Brand Direction

Archai should feel like a serious architecture drafting workspace: precise, ancient-foundation inspired, and technical without becoming decorative. The UI language is dark graphite, warm brass construction lines, oxidized green surfaces, and teal AI highlights.

Avoid spectral, neon-horror, mist-like, or haunted visual motifs. The product identity should stay grounded in architecture, structure, and systems thinking.

## Theme

Dark only. No light mode. The visual language is a dense technical workspace with a drafting-table canvas, layered dark surfaces, restrained borders, and vivid but selective accents.

All colors are defined as CSS custom properties in `globals.css` and mapped to Tailwind tokens via `@theme inline`. Components must use these tokens — no hardcoded hex values or raw Tailwind color classes like `zinc-*`.

| Role                   | CSS Variable              | Hex / Value                  |
| ---------------------- | ------------------------- | ---------------------------- |
| Page background        | `--bg-base`               | `#090A08`                    |
| Canvas background      | `--bg-canvas`             | `#0D0F0B`                    |
| Surface                | `--bg-surface`            | `#12140F`                    |
| Elevated surface       | `--bg-elevated`           | `#191C15`                    |
| Subtle surface         | `--bg-subtle`             | `#22271D`                    |
| Glass surface          | `--surface-glass`         | `rgba(18, 20, 15, 0.86)`     |
| Default border         | `--border-default`        | `#2D3327`                    |
| Subtle border          | `--border-subtle`         | `#424B39`                    |
| Construction line      | `--line-subtle`           | `#566047`                    |
| Active line            | `--line-strong`           | `#A9BB78`                    |
| Primary text           | `--text-primary`          | `#F2EFE7`                    |
| Secondary text         | `--text-secondary`        | `#CAC5B7`                    |
| Muted text             | `--text-muted`            | `#908B7D`                    |
| Faint text             | `--text-faint`            | `#5F5A4E`                    |
| Brand accent           | `--accent-primary`        | `#D6B56D` (brass)            |
| Strong brand accent    | `--accent-primary-strong` | `#F0CC7A`                    |
| Brand dim              | `--accent-primary-dim`    | `rgba(214, 181, 109, 0.16)`  |
| AI accent              | `--accent-ai`             | `#38D7BD` (teal)             |
| AI text                | `--accent-ai-text`        | `#86EEE0`                    |
| Error                  | `--state-error`           | `#FF5F57`                    |
| Success                | `--state-success`         | `#54D18A`                    |
| Warning                | `--state-warning`         | `#F2B84B`                    |
| Drafting grid line     | `--grid-line`             | `rgba(214, 181, 109, 0.08)`  |
| Drafting grid emphasis | `--grid-line-strong`      | `rgba(214, 181, 109, 0.14)`  |

Tailwind utility names map to these variables. Use `bg-base`, `bg-canvas`, `bg-surface`, `bg-elevated`, `text-copy-primary`, `text-copy-muted`, `border-surface-border`, `text-brand`, `text-brand-strong`, `text-ai-text`, `bg-accent-dim`, etc.

## Typography

| Role      | Font       | CSS Variable        |
| --------- | ---------- | ------------------- |
| UI text   | Geist Sans | `--font-geist-sans` |
| Code/mono | Geist Mono | `--font-geist-mono` |

Both fonts are loaded via `next/font/google` and applied as CSS variables on the `<html>` element. The base `body` uses Geist Sans with `antialiased`.

Use compact, work-focused type. Mono labels are appropriate for canvas metadata, system boundaries, coordinates, room status, and generated spec state. Avoid oversized marketing headings inside the application workspace.

## Border Radius

Archai should read as precise and tool-like. Radius is intentionally tighter than a soft SaaS dashboard.

| Context              | Class        |
| -------------------- | ------------ |
| Inputs / buttons     | `rounded-md` |
| Cards / panels       | `rounded-lg` |
| Modal / large dialog | `rounded-xl` |

## Canvas

### Canvas Background

React Flow `<Background>` component. Canvas sits on `--bg-canvas`, not the page background. Prefer a drafting-grid feel: subtle brass-tinted grid lines, stronger grid emphasis at larger intervals, and no decorative blobs or atmospheric gradients.

### Node Color Palette

8 defined color pairs. Each pair specifies a dark node fill and a vivid contrasting text color tuned for readability on the dark canvas. Defined in `types/canvas.ts` as `NODE_COLORS`.

| Node fill | Text color | Character              |
| --------- | ---------- | ---------------------- |
| `#1B1D18` | `#F2EFE7`  | Neutral dark (default) |
| `#112536` | `#7FB7FF`  | Blue                   |
| `#241D38` | `#B7A2FF`  | Violet                 |
| `#2D210D` | `#F0CC7A`  | Amber                  |
| `#331A16` | `#FF817A`  | Red                    |
| `#321925` | `#FF8CB5`  | Rose                   |
| `#132817` | `#7BD88F`  | Green                  |
| `#092824` | `#86EEE0`  | Teal                   |

Default node color: `#1B1D18` with `#F2EFE7` text.

### Edge Style

Smooth-step path with an arrow marker. Default edge color: `--line-strong`. Stroke width is thin — edges are visually secondary to nodes but should look like drafted system connections rather than glowing neon paths.

### Node Shapes

6 supported shapes, defined in `types/canvas.ts` as `NODE_SHAPES`. Complex shapes (diamond, hexagon, cylinder) are rendered as inline SVGs rather than CSS borders.

- `rectangle` — default general-purpose node
- `diamond` — decision / gateway
- `circle` — event / endpoint
- `pill` — service / process
- `cylinder` — database / storage
- `hexagon` — external system / boundary

### Connection Handles

Small circular handles using `--text-primary`, hidden by default, revealed on node hover. Appear at all four sides of a node.

## Component Library

shadcn/ui on top of Tailwind. No custom design system. Components live in `components/ui/`. Use the `shadcn` CLI to add new components rather than writing them from scratch.

## Layout Patterns

- Editor workspace: full-viewport layout — floating project/template sidebar on the left, center canvas, slide-over Archai assistant sidebar on the right.
- Sidebars: floating overlay with dark glass surface, subtle border, and restrained shadow.
- Panels: compact, information-dense, and tool-like. Do not nest cards inside cards.
- Modals and dialogs: centered overlay, `rounded-xl`, dark background with backdrop blur.
- Navbar: top bar with dark surface, bottom border, project identity, collaborators, and primary workspace actions.
- Empty states: show a focused canvas action or starter template path, not a marketing block.

## Icons

Lucide React. Stroke-based icons only — no filled variants. Icon sizes: `h-4 w-4` for inline, `h-5 w-5` for buttons, `h-8 w-8` for feature icons in empty states.

Prefer familiar tool icons for editing actions. Use the Archai wordmark or a compact geometric `A` mark for product identity.
