import { redirect } from "next/navigation"

import { EditorShell } from "@/components/editor/editor-shell"
import { getCurrentProjectIdentity } from "@/lib/project-access"
import { getEditorProjectListsForUser } from "@/lib/project-data"

export default async function EditorPage() {
  const identity = await getCurrentProjectIdentity()

  if (identity === null) {
    redirect("/sign-in")
  }

  const projectLists = await getEditorProjectListsForUser(identity)

  return <EditorShell {...projectLists} />
}
