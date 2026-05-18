"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface EditorHomeProps {
  onCreateProject: () => void
}

function EditorHome({ onCreateProject }: EditorHomeProps) {
  return (
    <section className="flex h-full items-center justify-center px-6 py-12 text-center">
      <div className="flex max-w-md flex-col items-center">
        <h1 className="text-2xl font-medium text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="mt-3 text-sm leading-6 text-copy-muted">
          Start a new architecture workspace, or choose a project from the
          sidebar.
        </p>
        <Button
          type="button"
          className="mt-6 rounded-md"
          onClick={onCreateProject}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Project
        </Button>
      </div>
    </section>
  )
}

export { EditorHome }
