"use client"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EditorDialogPattern } from "@/components/editor/dialog-pattern"
import type { UseProjectDialoguesResult } from "@/components/editor/use-project-dialogues"

interface ProjectDialoguesProps {
  dialogues: UseProjectDialoguesResult
}

function ProjectDialogues({ dialogues }: ProjectDialoguesProps) {
  const selectedProjectName =
    dialogues.selectedProject?.name ?? "Selected project"
  const canSubmitProjectName =
    dialogues.formState.name.trim().length > 0 && !dialogues.isLoading

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      dialogues.closeDialogue()
    }
  }

  return (
    <>
      <Dialog
        open={dialogues.isCreateOpen}
        onOpenChange={handleOpenChange}
      >
        <EditorDialogPattern
          title="Create Project"
          footerActions={
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-md"
                disabled={dialogues.isLoading}
                onClick={dialogues.closeDialogue}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-project-form"
                className="rounded-md"
                disabled={!canSubmitProjectName}
              >
                {dialogues.isLoading ? "Creating..." : "Create Project"}
              </Button>
            </>
          }
        >
          <form
            id="create-project-form"
            className="grid gap-4"
            onSubmit={dialogues.submitCreateProject}
          >
            <div className="grid gap-2">
              <label
                htmlFor="create-project-name"
                className="text-sm font-medium text-copy-secondary"
              >
                Project name
              </label>
              <Input
                id="create-project-name"
                name="projectName"
                value={dialogues.formState.name}
                required
                autoComplete="off"
                placeholder="Architecture workspace"
                className="rounded-md bg-surface text-copy-primary placeholder:text-copy-faint"
                disabled={dialogues.isLoading}
                onChange={(event) =>
                  dialogues.setProjectName(event.currentTarget.value)
                }
              />
            </div>
            <div className="rounded-md border border-surface-border bg-surface px-3 py-2">
              <p className="text-xs font-medium text-copy-muted">
                Slug preview
              </p>
              <p className="mt-1 truncate font-mono text-sm text-brand-strong">
                {dialogues.slugPreview}
              </p>
            </div>
          </form>
        </EditorDialogPattern>
      </Dialog>

      <Dialog
        open={dialogues.isRenameOpen}
        onOpenChange={handleOpenChange}
      >
        <EditorDialogPattern
          title="Rename Project"
          description={`Current project name: ${selectedProjectName}`}
          footerActions={
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-md"
                disabled={dialogues.isLoading}
                onClick={dialogues.closeDialogue}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="rename-project-form"
                className="rounded-md"
                disabled={!canSubmitProjectName}
              >
                {dialogues.isLoading ? "Renaming..." : "Rename Project"}
              </Button>
            </>
          }
        >
          <form
            id="rename-project-form"
            className="grid gap-2"
            onSubmit={dialogues.submitRenameProject}
          >
            <label
              htmlFor="rename-project-name"
              className="text-sm font-medium text-copy-secondary"
            >
              Project name
            </label>
            <Input
              id="rename-project-name"
              name="projectName"
              value={dialogues.formState.name}
              required
              autoFocus
              autoComplete="off"
              className="rounded-md bg-surface text-copy-primary"
              disabled={dialogues.isLoading}
              onChange={(event) =>
                dialogues.setProjectName(event.currentTarget.value)
              }
            />
          </form>
        </EditorDialogPattern>
      </Dialog>

      <Dialog
        open={dialogues.isDeleteOpen}
        onOpenChange={handleOpenChange}
      >
        <EditorDialogPattern
          title="Delete Project"
          description={`Confirm deletion of ${selectedProjectName}.`}
          footerActions={
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-md"
                disabled={dialogues.isLoading}
                onClick={dialogues.closeDialogue}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-md"
                disabled={dialogues.isLoading}
                onClick={dialogues.confirmDeleteProject}
              >
                {dialogues.isLoading ? "Deleting..." : "Delete Project"}
              </Button>
            </>
          }
        />
      </Dialog>
    </>
  )
}

export { ProjectDialogues }
