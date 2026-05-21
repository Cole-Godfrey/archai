"use client"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EditorDialogPattern } from "@/components/editor/dialog-pattern"
import type { UseProjectActionsResult } from "@/hooks/use-project-actions"

interface ProjectDialoguesProps {
  actions: UseProjectActionsResult
}

function ProjectDialogues({ actions }: ProjectDialoguesProps) {
  const selectedProjectName = actions.targetProject?.name ?? "Selected project"
  const hasProjectName = actions.formState.name.trim().length > 0
  const hasInvalidRoomId =
    actions.isCreateOpen && hasProjectName && !actions.hasValidRoomId
  const canSubmitCreate = actions.hasValidRoomId && !actions.isLoading
  const canSubmitRename = hasProjectName && !actions.isLoading

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      actions.closeDialog()
    }
  }

  return (
    <>
      <Dialog
        open={actions.isCreateOpen}
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
                disabled={actions.isLoading}
                onClick={actions.closeDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-project-form"
                className="rounded-md"
                disabled={!canSubmitCreate}
              >
                {actions.isLoading ? "Creating..." : "Create Project"}
              </Button>
            </>
          }
        >
          <form
            id="create-project-form"
            className="grid gap-2"
            onSubmit={actions.submitCreateProject}
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
                value={actions.formState.name}
                required
                autoComplete="off"
                placeholder="Architecture workspace"
                className="rounded-md bg-surface text-copy-primary placeholder:text-copy-faint"
                disabled={actions.isLoading}
                aria-describedby="create-project-room-id"
                aria-invalid={hasInvalidRoomId || undefined}
                onChange={(event) =>
                  actions.setProjectName(event.currentTarget.value)
                }
              />
              <p
                id="create-project-room-id"
                className="min-h-5 truncate font-mono text-xs text-brand-strong"
              >
                {actions.roomIdPreview}
              </p>
            </div>
            {hasInvalidRoomId ? (
              <p className="text-xs text-state-error">
                Use at least one letter or number.
              </p>
            ) : null}
            {actions.errorMessage ? (
              <p className="text-xs text-state-error">{actions.errorMessage}</p>
            ) : null}
          </form>
        </EditorDialogPattern>
      </Dialog>

      <Dialog
        open={actions.isRenameOpen}
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
                disabled={actions.isLoading}
                onClick={actions.closeDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="rename-project-form"
                className="rounded-md"
                disabled={!canSubmitRename}
              >
                {actions.isLoading ? "Renaming..." : "Rename Project"}
              </Button>
            </>
          }
        >
          <form
            id="rename-project-form"
            className="grid gap-2"
            onSubmit={actions.submitRenameProject}
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
              value={actions.formState.name}
              required
              autoFocus
              autoComplete="off"
              className="rounded-md bg-surface text-copy-primary"
              disabled={actions.isLoading}
              onChange={(event) =>
                actions.setProjectName(event.currentTarget.value)
              }
            />
            {actions.errorMessage ? (
              <p className="text-xs text-state-error">{actions.errorMessage}</p>
            ) : null}
          </form>
        </EditorDialogPattern>
      </Dialog>

      <Dialog
        open={actions.isDeleteOpen}
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
                disabled={actions.isLoading}
                onClick={actions.closeDialog}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-md"
                disabled={actions.isLoading}
                onClick={actions.confirmDeleteProject}
              >
                {actions.isLoading ? "Deleting..." : "Delete Project"}
              </Button>
            </>
          }
        >
          {actions.errorMessage ? (
            <p className="text-xs text-state-error">{actions.errorMessage}</p>
          ) : null}
        </EditorDialogPattern>
      </Dialog>
    </>
  )
}

export { ProjectDialogues }
