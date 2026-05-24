"use client"

import {
  Share2,
  Sparkles,
} from "lucide-react"
import { useState } from "react"

import { BaseCanvas } from "@/components/editor/base-canvas"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogues } from "@/components/editor/project-dialogues"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { Button } from "@/components/ui/button"
import { useProjectActions } from "@/hooks/use-project-actions"
import { cn } from "@/lib/utils"
import type { EditorProject, EditorProjectLists } from "@/types/project"

interface WorkspaceProject {
  id: string
  name: string
  roomId: string
  role: EditorProject["role"]
}

interface EditorWorkspaceShellProps extends EditorProjectLists {
  currentProject: WorkspaceProject
}

function WorkspaceProjectTitle({ project }: { project: WorkspaceProject }) {
  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-sm font-medium text-copy-primary">
        {project.name}
      </p>
      <p className="hidden truncate font-mono text-xs text-copy-muted sm:block">
        /{project.roomId}
      </p>
    </div>
  )
}

function EditorWorkspaceShell({
  currentProject,
  ownedProjects,
  sharedProjects,
}: EditorWorkspaceShellProps) {
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(true)
  const [isAssistantOpen, setIsAssistantOpen] = useState(true)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const projectActions = useProjectActions({
    activeProjectId: currentProject.id,
    ownedProjects,
    sharedProjects,
  })
  const assistantLabel = isAssistantOpen
    ? "Close Archai assistant"
    : "Open Archai assistant"

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isProjectSidebarOpen}
        centerSlot={<WorkspaceProjectTitle project={currentProject} />}
        actionSlot={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden rounded-md border-surface-border bg-elevated text-copy-secondary sm:inline-flex"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-md border-surface-border bg-elevated text-copy-secondary sm:hidden"
              aria-label="Share project"
              title="Share project"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant={isAssistantOpen ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "hidden rounded-md border-surface-border sm:inline-flex",
                isAssistantOpen
                  ? "bg-subtle text-ai-text"
                  : "bg-elevated text-copy-secondary"
              )}
              aria-label={assistantLabel}
              aria-pressed={isAssistantOpen}
              title={assistantLabel}
              onClick={() => setIsAssistantOpen((isOpen) => !isOpen)}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI
            </Button>
            <Button
              type="button"
              variant={isAssistantOpen ? "secondary" : "outline"}
              size="icon"
              className={cn(
                "rounded-md border-surface-border sm:hidden",
                isAssistantOpen
                  ? "bg-subtle text-ai-text"
                  : "bg-elevated text-copy-secondary"
              )}
              aria-label={assistantLabel}
              aria-pressed={isAssistantOpen}
              title={assistantLabel}
              onClick={() => setIsAssistantOpen((isOpen) => !isOpen)}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        }
        onToggleSidebar={() =>
          setIsProjectSidebarOpen((isOpen) => !isOpen)
        }
      />
      <main className="relative flex min-h-0 flex-1 overflow-hidden bg-canvas">
        <BaseCanvas roomId={currentProject.roomId} />

        {isAssistantOpen ? (
          <aside className="fixed bottom-4 right-4 top-[4.5rem] z-30 flex w-80 max-w-[calc(100vw-2rem)] shrink-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-glass shadow-xl backdrop-blur-md md:static md:z-auto md:max-w-none md:rounded-none md:border-y-0 md:border-r-0 md:bg-surface md:shadow-none md:backdrop-blur-none">
            <div className="flex h-14 items-center gap-2 border-b border-surface-border px-4">
              <Sparkles className="h-4 w-4 text-ai-text" aria-hidden="true" />
              <h2 className="text-sm font-medium text-copy-primary">
                Archai Assistant
              </h2>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
              <p className="text-sm leading-6 text-copy-muted">
                AI chat placeholder
              </p>
            </div>
          </aside>
        ) : null}

        <ProjectSidebar
          isOpen={isProjectSidebarOpen}
          activeProjectId={currentProject.id}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          onClose={() => setIsProjectSidebarOpen(false)}
          onCreateProject={projectActions.openCreateDialog}
          onRenameProject={projectActions.openRenameDialog}
          onDeleteProject={projectActions.openDeleteDialog}
        />
      </main>
      <ShareDialog
        open={isShareDialogOpen}
        projectId={currentProject.id}
        projectName={currentProject.name}
        canManageAccess={currentProject.role === "owner"}
        onOpenChange={setIsShareDialogOpen}
      />
      <ProjectDialogues actions={projectActions} />
    </div>
  )
}

export { EditorWorkspaceShell }
