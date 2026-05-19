"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

import type { MockProject } from "@/components/editor/mock-projects"

type ProjectDialogue = "create" | "rename" | "delete"

interface ProjectFormState {
  name: string
}

interface UseProjectDialoguesResult {
  activeDialogue: ProjectDialogue | null
  selectedProject: MockProject | null
  formState: ProjectFormState
  slugPreview: string
  hasValidSlug: boolean
  isLoading: boolean
  isCreateOpen: boolean
  isRenameOpen: boolean
  isDeleteOpen: boolean
  openCreateDialogue: () => void
  openRenameDialogue: (project: MockProject) => void
  openDeleteDialogue: (project: MockProject) => void
  closeDialogue: () => void
  setProjectName: (name: string) => void
  submitCreateProject: (event: FormEvent<HTMLFormElement>) => void
  submitRenameProject: (event: FormEvent<HTMLFormElement>) => void
  confirmDeleteProject: () => void
}

function getSlugPreview(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function useProjectDialogues(): UseProjectDialoguesResult {
  const [activeDialogue, setActiveDialogue] = useState<ProjectDialogue | null>(
    null
  )
  const [selectedProject, setSelectedProject] = useState<MockProject | null>(
    null
  )
  const [formState, setFormState] = useState<ProjectFormState>({ name: "" })
  const [isLoading, setIsLoading] = useState(false)
  const pendingSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const slugPreview = useMemo(
    () => getSlugPreview(formState.name),
    [formState.name]
  )
  const hasValidSlug = slugPreview.length > 0

  function clearPendingSubmit() {
    if (pendingSubmitRef.current === null) {
      return
    }

    clearTimeout(pendingSubmitRef.current)
    pendingSubmitRef.current = null
  }

  function closeDialogue() {
    clearPendingSubmit()
    setActiveDialogue(null)
    setSelectedProject(null)
    setFormState({ name: "" })
    setIsLoading(false)
  }

  function openCreateDialogue() {
    clearPendingSubmit()
    setSelectedProject(null)
    setFormState({ name: "" })
    setIsLoading(false)
    setActiveDialogue("create")
  }

  function openRenameDialogue(project: MockProject) {
    clearPendingSubmit()
    setSelectedProject(project)
    setFormState({ name: project.name })
    setIsLoading(false)
    setActiveDialogue("rename")
  }

  function openDeleteDialogue(project: MockProject) {
    clearPendingSubmit()
    setSelectedProject(project)
    setFormState({ name: project.name })
    setIsLoading(false)
    setActiveDialogue("delete")
  }

  function setProjectName(name: string) {
    setFormState({ name })
  }

  function finishMockSubmission() {
    clearPendingSubmit()
    setIsLoading(true)

    pendingSubmitRef.current = setTimeout(() => {
      pendingSubmitRef.current = null
      setActiveDialogue(null)
      setSelectedProject(null)
      setFormState({ name: "" })
      setIsLoading(false)
    }, 200)
  }

  function submitCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isLoading || !hasValidSlug) {
      return
    }

    finishMockSubmission()
  }

  function submitRenameProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      isLoading ||
      selectedProject === null ||
      !hasValidSlug
    ) {
      return
    }

    finishMockSubmission()
  }

  function confirmDeleteProject() {
    if (isLoading || selectedProject === null) {
      return
    }

    finishMockSubmission()
  }

  useEffect(() => {
    return () => {
      if (pendingSubmitRef.current !== null) {
        clearTimeout(pendingSubmitRef.current)
        pendingSubmitRef.current = null
      }
    }
  }, [])

  return {
    activeDialogue,
    selectedProject,
    formState,
    slugPreview,
    hasValidSlug,
    isLoading,
    isCreateOpen: activeDialogue === "create",
    isRenameOpen: activeDialogue === "rename",
    isDeleteOpen: activeDialogue === "delete",
    openCreateDialogue,
    openRenameDialogue,
    openDeleteDialogue,
    closeDialogue,
    setProjectName,
    submitCreateProject,
    submitRenameProject,
    confirmDeleteProject,
  }
}

export { useProjectDialogues }
export type { UseProjectDialoguesResult }
