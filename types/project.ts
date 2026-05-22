interface EditorProject {
  id: string
  name: string
  roomId: string
  role: "owner" | "collaborator"
  updatedAtLabel: string
  ownerName?: string
}

interface EditorProjectLists {
  ownedProjects: EditorProject[]
  sharedProjects: EditorProject[]
}

export type { EditorProject, EditorProjectLists }
