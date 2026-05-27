"use client"

import {
  CheckCircle2,
  LayoutTemplate,
  LoaderCircle,
  Save as SaveIcon,
  Share2,
  Sparkles,
  TriangleAlert,
} from "lucide-react"
import { useCallback, useRef, useState } from "react"

import { AISidebar } from "@/components/editor/ai-sidebar"
import { BaseCanvas } from "@/components/editor/base-canvas"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogues } from "@/components/editor/project-dialogues"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { Button } from "@/components/ui/button"
import { useProjectActions } from "@/hooks/use-project-actions"
import { cn } from "@/lib/utils"
import type { CanvasSaveStatus } from "@/types/canvas"
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

interface CanvasSaveButtonProps {
  onSave: (() => void) | null
  status: CanvasSaveStatus
}

function CanvasSaveButton({ onSave, status }: CanvasSaveButtonProps) {
  const config =
    status === "saving"
      ? {
          Icon: LoaderCircle,
          label: "Saving...",
          title: "Saving canvas",
          className: "text-brand",
          iconClassName: "animate-spin",
        }
        : status === "error"
          ? {
              Icon: TriangleAlert,
              label: "Error",
              title: "Canvas save error",
              className: "border-state-error/60 text-state-error",
              iconClassName: "",
            }
          : status === "saved"
            ? {
                Icon: CheckCircle2,
                label: "Saved",
                title: "Canvas saved",
                className: "text-state-success",
                iconClassName: "",
              }
            : {
                Icon: SaveIcon,
                label: "Save",
                title: "Save canvas",
                className: "text-copy-secondary",
                iconClassName: "",
              }
  const Icon = config.Icon
  const isDisabled = onSave === null || status === "saving"

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "hidden rounded-md border-surface-border bg-elevated sm:inline-flex",
          config.className
        )}
        aria-label={config.title}
        disabled={isDisabled}
        title={config.title}
        onClick={() => onSave?.()}
      >
        <Icon
          className={cn("h-4 w-4", config.iconClassName)}
          aria-hidden="true"
        />
        {config.label}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "rounded-md border-surface-border bg-elevated sm:hidden",
          config.className
        )}
        aria-label={config.title}
        disabled={isDisabled}
        title={config.title}
        onClick={() => onSave?.()}
      >
        <Icon
          className={cn("h-4 w-4", config.iconClassName)}
          aria-hidden="true"
        />
      </Button>
    </>
  )
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
  const [canvasSaveStatus, setCanvasSaveStatus] =
    useState<CanvasSaveStatus>("idle")
  const [saveCanvasNow, setSaveCanvasNow] = useState<(() => void) | null>(null)
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(true)
  const [isAssistantOpen, setIsAssistantOpen] = useState(true)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [templateImportRequest, setTemplateImportRequest] = useState<{
    requestId: number
    template: CanvasTemplate
  } | null>(null)
  const templateImportRequestId = useRef(0)
  const projectActions = useProjectActions({
    activeProjectId: currentProject.id,
    ownedProjects,
    sharedProjects,
  })
  const assistantLabel = isAssistantOpen
    ? "Close Archai assistant"
    : "Open Archai assistant"

  const handleManualSaveChange = useCallback(
    (saveCanvas: (() => void) | null) => {
      setSaveCanvasNow(() => saveCanvas)
    },
    []
  )

  function importTemplate(template: CanvasTemplate) {
    templateImportRequestId.current += 1
    setTemplateImportRequest({
      requestId: templateImportRequestId.current,
      template,
    })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isProjectSidebarOpen}
        centerSlot={<WorkspaceProjectTitle project={currentProject} />}
        actionSlot={
          <>
            <CanvasSaveButton
              onSave={saveCanvasNow}
              status={canvasSaveStatus}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden rounded-md border-surface-border bg-elevated text-copy-secondary sm:inline-flex"
              onClick={() => setIsTemplatesModalOpen(true)}
            >
              <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
              Templates
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-md border-surface-border bg-elevated text-copy-secondary sm:hidden"
              aria-label="Open starter templates"
              title="Open starter templates"
              onClick={() => setIsTemplatesModalOpen(true)}
            >
              <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
            </Button>
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
        showUserButton={false}
      />
      <main className="relative flex min-h-0 flex-1 overflow-hidden bg-canvas">
        <BaseCanvas
          onManualSaveChange={handleManualSaveChange}
          onSaveStatusChange={setCanvasSaveStatus}
          projectId={currentProject.id}
          roomId={currentProject.roomId}
          templateImportRequest={templateImportRequest}
        />

        <AISidebar
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
        />

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
      <StarterTemplatesModal
        open={isTemplatesModalOpen}
        onImport={importTemplate}
        onOpenChange={setIsTemplatesModalOpen}
      />
      <ProjectDialogues actions={projectActions} />
    </div>
  )
}

export { EditorWorkspaceShell }
