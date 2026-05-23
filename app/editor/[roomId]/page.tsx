import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { EditorWorkspaceShell } from "@/components/editor/editor-workspace-shell"
import {
  getCurrentProjectIdentity,
  getProjectAccessForIdentity,
} from "@/lib/project-access"
import { getEditorProjectListsForUser } from "@/lib/project-data"

interface EditorWorkspacePageProps {
  params: Promise<{
    roomId: string
  }>
}

export default async function EditorWorkspacePage({
  params,
}: EditorWorkspacePageProps) {
  const { roomId } = await params
  const identity = await getCurrentProjectIdentity()

  if (identity === null) {
    redirect("/sign-in")
  }

  const [access, projectLists] = await Promise.all([
    getProjectAccessForIdentity(roomId, identity),
    getEditorProjectListsForUser(identity),
  ])

  if (access === null) {
    return <AccessDenied />
  }

  return (
    <EditorWorkspaceShell
      {...projectLists}
      currentProject={{
        id: access.project.id,
        name: access.project.name,
        roomId: access.project.id,
        role: access.role,
      }}
    />
  )
}
