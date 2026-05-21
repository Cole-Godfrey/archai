import { EditorShell } from "@/components/editor/editor-shell"
import { getCurrentUserProjectLists } from "@/lib/project-data"

export default async function EditorPage() {
  const projectLists = await getCurrentUserProjectLists()

  return <EditorShell {...projectLists} />
}
