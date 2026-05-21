"use client"

import { useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import type { EditorProject } from "@/types/project"

type ProjectActionDialog = "create" | "rename" | "delete"

interface ProjectFormState {
  name: string
}

interface UseProjectActionsOptions {
  activeProjectId?: string
  ownedProjects: EditorProject[]
  sharedProjects: EditorProject[]
}

interface UseProjectActionsResult {
  activeDialog: ProjectActionDialog | null
  targetProject: EditorProject | null
  formState: ProjectFormState
  roomIdPreview: string
  hasValidRoomId: boolean
  isLoading: boolean
  errorMessage: string | null
  isCreateOpen: boolean
  isRenameOpen: boolean
  isDeleteOpen: boolean
  openCreateDialog: () => void
  openRenameDialog: (project: EditorProject) => void
  openDeleteDialog: (project: EditorProject) => void
  closeDialog: () => void
  setProjectName: (name: string) => void
  submitCreateProject: (event: FormEvent<HTMLFormElement>) => Promise<void>
  submitRenameProject: (event: FormEvent<HTMLFormElement>) => Promise<void>
  confirmDeleteProject: () => Promise<void>
}

interface ProjectMutationResponse {
  project: {
    id: string
    name: string
  }
}

const ROOM_ID_SUFFIX_LENGTH = 6
const ROOM_ID_BASE_MAX_LENGTH = 52
const ROOM_ID_SUFFIX_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isProjectMutationResponse(
  value: unknown
): value is ProjectMutationResponse {
  return (
    isRecord(value) &&
    isRecord(value.project) &&
    typeof value.project.id === "string" &&
    typeof value.project.name === "string"
  )
}

function slugifyProjectName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ROOM_ID_BASE_MAX_LENGTH)
    .replace(/-+$/g, "")
}

function createRandomSuffix() {
  const values = new Uint8Array(ROOM_ID_SUFFIX_LENGTH)
  crypto.getRandomValues(values)

  return Array.from(values, (value) => {
    return ROOM_ID_SUFFIX_ALPHABET[value % ROOM_ID_SUFFIX_ALPHABET.length]
  }).join("")
}

function createUniqueSuffix(existingRoomIds: Set<string>) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = createRandomSuffix()

    if (![...existingRoomIds].some((roomId) => roomId.endsWith(`-${suffix}`))) {
      return suffix
    }
  }

  return createRandomSuffix()
}

function getRoomIdPreview(name: string, suffix: string) {
  const slugBase = slugifyProjectName(name)

  if (slugBase.length === 0 || suffix.length === 0) {
    return ""
  }

  return `${slugBase}-${suffix}`
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error
  }

  return fallback
}

function useProjectActions({
  activeProjectId,
  ownedProjects,
  sharedProjects,
}: UseProjectActionsOptions): UseProjectActionsResult {
  const router = useRouter()
  const [activeDialog, setActiveDialog] = useState<ProjectActionDialog | null>(
    null
  )
  const [targetProject, setTargetProject] = useState<EditorProject | null>(null)
  const [formState, setFormState] = useState<ProjectFormState>({ name: "" })
  const [createSuffix, setCreateSuffix] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const existingRoomIds = useMemo(() => {
    return new Set(
      [...ownedProjects, ...sharedProjects].map((project) => project.roomId)
    )
  }, [ownedProjects, sharedProjects])

  const roomIdPreview = useMemo(
    () => getRoomIdPreview(formState.name, createSuffix),
    [createSuffix, formState.name]
  )
  const hasValidRoomId = roomIdPreview.length > 0

  function resetState() {
    setActiveDialog(null)
    setTargetProject(null)
    setFormState({ name: "" })
    setCreateSuffix("")
    setIsLoading(false)
    setErrorMessage(null)
  }

  function closeDialog() {
    resetState()
  }

  function openCreateDialog() {
    const suffix = createUniqueSuffix(existingRoomIds)

    setTargetProject(null)
    setFormState({ name: "" })
    setCreateSuffix(suffix)
    setIsLoading(false)
    setErrorMessage(null)
    setActiveDialog("create")
  }

  function openRenameDialog(project: EditorProject) {
    setTargetProject(project)
    setFormState({ name: project.name })
    setCreateSuffix("")
    setIsLoading(false)
    setErrorMessage(null)
    setActiveDialog("rename")
  }

  function openDeleteDialog(project: EditorProject) {
    setTargetProject(project)
    setFormState({ name: project.name })
    setCreateSuffix("")
    setIsLoading(false)
    setErrorMessage(null)
    setActiveDialog("delete")
  }

  function setProjectName(name: string) {
    setFormState({ name })
    setErrorMessage(null)
  }

  async function submitCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isLoading || !hasValidRoomId) {
      return
    }

    const projectName = formState.name.trim()

    setIsLoading(true)
    setErrorMessage(null)

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: roomIdPreview,
        name: projectName,
      }),
    })
    const payload = await readJson(response)

    if (!response.ok) {
      setErrorMessage(
        getApiErrorMessage(payload, "Unable to create the project.")
      )
      setIsLoading(false)
      return
    }

    if (!isProjectMutationResponse(payload)) {
      setErrorMessage("The project response was invalid.")
      setIsLoading(false)
      return
    }

    resetState()
    router.push(`/editor/${encodeURIComponent(payload.project.id)}`)
  }

  async function submitRenameProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const projectName = formState.name.trim()

    if (isLoading || targetProject === null || projectName.length === 0) {
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    const response = await fetch(
      `/api/projects/${encodeURIComponent(targetProject.id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
        }),
      }
    )
    const payload = await readJson(response)

    if (!response.ok) {
      setErrorMessage(
        getApiErrorMessage(payload, "Unable to rename the project.")
      )
      setIsLoading(false)
      return
    }

    resetState()
    router.refresh()
  }

  async function confirmDeleteProject() {
    if (isLoading || targetProject === null) {
      return
    }

    const projectId = targetProject.id

    setIsLoading(true)
    setErrorMessage(null)

    const response = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}`,
      {
        method: "DELETE",
      }
    )
    const payload = await readJson(response)

    if (!response.ok) {
      setErrorMessage(
        getApiErrorMessage(payload, "Unable to delete the project.")
      )
      setIsLoading(false)
      return
    }

    resetState()

    if (activeProjectId === projectId) {
      router.replace("/editor")
      return
    }

    router.refresh()
  }

  return {
    activeDialog,
    targetProject,
    formState,
    roomIdPreview,
    hasValidRoomId,
    isLoading,
    errorMessage,
    isCreateOpen: activeDialog === "create",
    isRenameOpen: activeDialog === "rename",
    isDeleteOpen: activeDialog === "delete",
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    setProjectName,
    submitCreateProject,
    submitRenameProject,
    confirmDeleteProject,
  }
}

export { useProjectActions }
export type { UseProjectActionsResult }
