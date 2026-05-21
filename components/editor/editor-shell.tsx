"use client"

import { useState } from "react"

import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogues } from "@/components/editor/project-dialogues"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { EditorProjectLists } from "@/types/project"

interface EditorShellProps extends EditorProjectLists {
  activeProjectId?: string
}

function EditorShell({
  activeProjectId,
  ownedProjects,
  sharedProjects,
}: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const projectActions = useProjectActions({
    activeProjectId,
    ownedProjects,
    sharedProjects,
  })

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
      />
      <main className="relative min-h-0 flex-1 overflow-hidden bg-canvas">
        <EditorHome onCreateProject={projectActions.openCreateDialog} />
        <ProjectSidebar
          isOpen={isSidebarOpen}
          activeProjectId={activeProjectId}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          onClose={() => setIsSidebarOpen(false)}
          onCreateProject={projectActions.openCreateDialog}
          onRenameProject={projectActions.openRenameDialog}
          onDeleteProject={projectActions.openDeleteDialog}
        />
      </main>
      <ProjectDialogues actions={projectActions} />
    </div>
  )
}

export { EditorShell }
