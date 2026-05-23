import { Lock } from "lucide-react"
import Link from "next/link"

function AccessDenied() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-copy-primary">
      <section className="flex max-w-sm flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-surface-border bg-elevated text-brand">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-lg font-medium">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-copy-muted">
          This project is unavailable or has not been shared with you.
        </p>
        <Link
          href="/editor"
          className="mt-6 inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to editor
        </Link>
      </section>
    </main>
  )
}

export { AccessDenied }
