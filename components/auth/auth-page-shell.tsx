import type { ReactNode } from "react"

interface AuthPageShellProps {
  children: ReactNode
}

const authHighlights = [
  {
    title: "AI architecture drafting",
    description: "Describe the system; Archai lays out nodes and edges.",
  },
  {
    title: "Live team collaboration",
    description: "Share presence, cursors, and edits across one canvas.",
  },
  {
    title: "Spec generation on demand",
    description: "Export a Markdown technical spec from the canvas graph.",
  },
]

function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="grid min-h-dvh bg-base text-copy-primary lg:grid-cols-2">
      <section className="hidden border-r border-surface-border bg-elevated px-10 py-8 lg:grid lg:min-h-dvh lg:grid-rows-[auto_1fr_auto] xl:px-16">
        <header>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-brand font-mono text-sm font-semibold text-base">
              A
            </div>
            <span className="text-sm font-semibold text-copy-primary">
              Archai
            </span>
          </div>
        </header>

        <div className="flex items-center">
          <div className="max-w-xl space-y-10">
            <div className="max-w-lg space-y-5">
              <p className="font-mono text-xs uppercase text-brand">
                AI system architecture
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-copy-primary">
                Shape system designs as quickly as ideas form.
              </h1>
              <p className="text-base leading-7 text-copy-secondary">
                Explain your architecture in plain English. Archai turns it
                into a shared canvas your team can refine together in real time.
              </p>
            </div>

            <ul className="space-y-5 text-sm">
              {authHighlights.map((highlight) => (
                <li
                  key={highlight.title}
                  className="border-l border-brand pl-4"
                >
                  <p className="font-semibold text-copy-primary">
                    {highlight.title}
                  </p>
                  <p className="mt-1 leading-6 text-copy-muted">
                    {highlight.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer>
          <p className="max-w-sm text-xs leading-5 text-copy-faint">
            2026 Archai. All rights reserved.
          </p>
        </footer>
      </section>

      <section className="flex min-h-dvh items-center justify-center bg-base px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex w-full justify-center">{children}</div>
      </section>
    </main>
  )
}

export { AuthPageShell }
