import { notFound } from "next/navigation"

import { EditorShell } from "@/components/editor/editor-shell"
import { getCurrentUserProjectLists } from "@/lib/project-data"

interface EditorWorkspacePageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function EditorWorkspacePage({
  params,
}: EditorWorkspacePageProps) {
  const { projectId } = await params
  const projectLists = await getCurrentUserProjectLists()
  const accessibleProjects = [
    ...projectLists.ownedProjects,
    ...projectLists.sharedProjects,
  ]

  if (!accessibleProjects.some((project) => project.id === projectId)) {
    notFound()
  }

  return <EditorShell {...projectLists} activeProjectId={projectId} />
}
