"use client"

import { useState } from "react"

import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogues } from "@/components/editor/project-dialogues"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectDialogues } from "@/components/editor/use-project-dialogues"

function EditorShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const projectDialogues = useProjectDialogues()

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
      />
      <main className="relative min-h-0 flex-1 overflow-hidden bg-canvas">
        <EditorHome onCreateProject={projectDialogues.openCreateDialogue} />
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onCreateProject={projectDialogues.openCreateDialogue}
          onRenameProject={projectDialogues.openRenameDialogue}
          onDeleteProject={projectDialogues.openDeleteDialogue}
        />
      </main>
      <ProjectDialogues dialogues={projectDialogues} />
    </div>
  )
}

export { EditorShell }
