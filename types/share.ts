import type { EditorProject } from "@/types/project"

interface ProjectCollaboratorSummary {
  id: string
  role: "owner" | "collaborator"
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}

interface ProjectCollaboratorsResponse {
  accessRole: EditorProject["role"]
  collaborators: ProjectCollaboratorSummary[]
}

interface ProjectCollaboratorMutationResponse {
  collaborator: ProjectCollaboratorSummary
}

interface ProjectCollaboratorDeleteResponse {
  success: true
  email: string
}

export type {
  ProjectCollaboratorDeleteResponse,
  ProjectCollaboratorMutationResponse,
  ProjectCollaboratorsResponse,
  ProjectCollaboratorSummary,
}
