"use client"

import {
  Check,
  Copy,
  Loader2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react"

import { EditorDialogPattern } from "@/components/editor/dialog-pattern"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type {
  ProjectCollaboratorDeleteResponse,
  ProjectCollaboratorMutationResponse,
  ProjectCollaboratorsResponse,
  ProjectCollaboratorSummary,
} from "@/types/share"

interface ShareDialogProps {
  open: boolean
  projectId: string
  projectName: string
  canManageAccess: boolean
  onOpenChange: (open: boolean) => void
}

interface CollaboratorAvatarProps {
  collaborator: ProjectCollaboratorSummary
}

const COPIED_FEEDBACK_MS = 1800

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isCollaboratorSummary(
  value: unknown
): value is ProjectCollaboratorSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.role === "owner" || value.role === "collaborator") &&
    (typeof value.email === "string" || value.email === null) &&
    (typeof value.displayName === "string" || value.displayName === null) &&
    (typeof value.avatarUrl === "string" || value.avatarUrl === null) &&
    typeof value.createdAt === "string"
  )
}

function isCollaboratorsResponse(
  value: unknown
): value is ProjectCollaboratorsResponse {
  return (
    isRecord(value) &&
    (value.accessRole === "owner" || value.accessRole === "collaborator") &&
    Array.isArray(value.collaborators) &&
    value.collaborators.every(isCollaboratorSummary)
  )
}

function isCollaboratorMutationResponse(
  value: unknown
): value is ProjectCollaboratorMutationResponse {
  return isRecord(value) && isCollaboratorSummary(value.collaborator)
}

function isCollaboratorDeleteResponse(
  value: unknown
): value is ProjectCollaboratorDeleteResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.email === "string"
  )
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

function CollaboratorAvatar({ collaborator }: CollaboratorAvatarProps) {
  const fallbackText =
    collaborator.displayName ?? collaborator.email ?? "Project owner"
  const fallbackInitial = fallbackText.charAt(0).toUpperCase()

  if (collaborator.avatarUrl !== null) {
    return (
      <span
        className="h-8 w-8 shrink-0 rounded-md border border-surface-border bg-cover bg-center"
        style={{ backgroundImage: `url("${collaborator.avatarUrl}")` }}
        aria-hidden="true"
      />
    )
  }

  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-surface-border bg-subtle font-mono text-xs text-copy-secondary"
      aria-hidden="true"
    >
      {fallbackInitial}
    </span>
  )
}

function ShareDialog({
  open,
  projectId,
  projectName,
  canManageAccess,
  onOpenChange,
}: ShareDialogProps) {
  const [accessRole, setAccessRole] = useState<
    ProjectCollaboratorsResponse["accessRole"]
  >(canManageAccess ? "owner" : "collaborator")
  const [collaborators, setCollaborators] = useState<
    ProjectCollaboratorSummary[]
  >([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const canManage = accessRole === "owner"
  const projectLink = useMemo(
    () => `/editor/${encodeURIComponent(projectId)}`,
    [projectId]
  )
  const collaboratorsUrl = useMemo(
    () => `/api/projects/${encodeURIComponent(projectId)}/collaborators`,
    [projectId]
  )

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setInviteEmail("")
      setErrorMessage(null)
      setCopied(false)
    }

    onOpenChange(isOpen)
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadCollaborators() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(collaboratorsUrl, {
          signal: controller.signal,
        })
        const payload = await readJson(response)

        if (!response.ok) {
          setErrorMessage(
            getApiErrorMessage(payload, "Unable to load collaborators.")
          )
          return
        }

        if (!isCollaboratorsResponse(payload)) {
          setErrorMessage("The collaborator response was invalid.")
          return
        }

        setAccessRole(payload.accessRole)
        setCollaborators(payload.collaborators)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setErrorMessage("Unable to load collaborators.")
      } finally {
        setIsLoading(false)
      }
    }

    if (open) {
      void loadCollaborators()
    }

    return () => controller.abort()
  }, [collaboratorsUrl, open])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false)
    }, COPIED_FEEDBACK_MS)

    return () => window.clearTimeout(timeoutId)
  }, [copied])

  async function copyProjectLink() {
    if (!projectLink || !navigator.clipboard) {
      setErrorMessage("Unable to copy the project link.")
      return
    }

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${projectLink}`
      )
      setCopied(true)
      setErrorMessage(null)
    } catch {
      setErrorMessage("Unable to copy the project link.")
    }
  }

  async function inviteCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const email = inviteEmail.trim()

    if (!canManage || isInviting || email.length === 0) {
      return
    }

    setIsInviting(true)
    setErrorMessage(null)

    try {
      const response = await fetch(collaboratorsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
      const payload = await readJson(response)

      if (!response.ok) {
        setErrorMessage(
          getApiErrorMessage(payload, "Unable to invite collaborator.")
        )
        return
      }

      if (!isCollaboratorMutationResponse(payload)) {
        setErrorMessage("The invite response was invalid.")
        return
      }

      setInviteEmail("")
      setCollaborators((currentCollaborators) => [
        ...currentCollaborators.filter(
          (collaborator) => collaborator.email !== payload.collaborator.email
        ),
        payload.collaborator,
      ])
    } catch {
      setErrorMessage("Unable to invite collaborator.")
    } finally {
      setIsInviting(false)
    }
  }

  async function removeCollaborator(email: string) {
    if (!canManage || removingEmail !== null) {
      return
    }

    setRemovingEmail(email)
    setErrorMessage(null)

    try {
      const response = await fetch(collaboratorsUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
      const payload = await readJson(response)

      if (!response.ok) {
        setErrorMessage(
          getApiErrorMessage(payload, "Unable to remove collaborator.")
        )
        return
      }

      if (!isCollaboratorDeleteResponse(payload)) {
        setErrorMessage("The remove response was invalid.")
        return
      }

      setCollaborators((currentCollaborators) =>
        currentCollaborators.filter(
          (collaborator) => collaborator.email !== payload.email
        )
      )
    } catch {
      setErrorMessage("Unable to remove collaborator.")
    } finally {
      setRemovingEmail(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <EditorDialogPattern
        title="Share Project"
        description={projectName}
        className="sm:max-w-lg"
        footerActions={
          <Button
            type="button"
            variant="outline"
            className="rounded-md"
            onClick={() => handleOpenChange(false)}
          >
            Close
          </Button>
        }
      >
        <div className="grid gap-4">
          {canManage ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <label
                  htmlFor="project-share-link"
                  className="text-sm font-medium text-copy-secondary"
                >
                  Project link
                </label>
                <div className="flex gap-2">
                  <Input
                    id="project-share-link"
                    value={projectLink}
                    readOnly
                    className="rounded-md bg-surface font-mono text-xs text-copy-secondary"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-md"
                    onClick={copyProjectLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              <form className="grid gap-2" onSubmit={inviteCollaborator}>
                <label
                  htmlFor="collaborator-email"
                  className="text-sm font-medium text-copy-secondary"
                >
                  Invite collaborator
                </label>
                <div className="flex gap-2">
                  <Input
                    id="collaborator-email"
                    type="email"
                    required
                    value={inviteEmail}
                    placeholder="collaborator@example.com"
                    autoComplete="email"
                    className="rounded-md bg-surface text-copy-primary placeholder:text-copy-faint"
                    disabled={isInviting}
                    onChange={(event) =>
                      setInviteEmail(event.currentTarget.value)
                    }
                  />
                  <Button
                    type="submit"
                    className="rounded-md"
                    disabled={isInviting || inviteEmail.trim().length === 0}
                  >
                    {isInviting ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                    )}
                    Invite
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          <section className="grid gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" aria-hidden="true" />
              <h3 className="text-sm font-medium text-copy-primary">
                People with access
              </h3>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-surface-border bg-surface/70">
              {isLoading ? (
                <div className="flex h-28 items-center justify-center gap-2 text-sm text-copy-muted">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Loading collaborators
                </div>
              ) : collaborators.length === 0 ? (
                <div className="flex h-28 items-center justify-center px-6 text-center text-sm text-copy-muted">
                  No project members found.
                </div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {collaborators.map((collaborator) => {
                    const displayName =
                      collaborator.displayName ??
                      collaborator.email ??
                      "Project owner"
                    const collaboratorEmail = collaborator.email
                    const isRemoving = removingEmail === collaboratorEmail
                    const canRemoveCollaborator =
                      canManage &&
                      collaborator.role === "collaborator" &&
                      collaboratorEmail !== null
                    const removeLabel = collaboratorEmail ?? displayName

                    return (
                      <li
                        key={collaborator.id}
                        className="flex min-h-14 items-center gap-3 px-3 py-2"
                      >
                        <CollaboratorAvatar collaborator={collaborator} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-copy-primary">
                            {displayName}
                          </p>
                          <div className="mt-0.5 flex min-w-0 items-center gap-2">
                            {collaboratorEmail !== null ? (
                              <p
                                className={cn(
                                  "truncate font-mono text-xs text-copy-muted",
                                  collaborator.displayName === null &&
                                    "sr-only"
                                )}
                              >
                                {collaboratorEmail}
                              </p>
                            ) : null}
                            {collaborator.role === "owner" ? (
                              <span className="rounded-md border border-brand/40 bg-accent-dim px-1.5 py-0.5 text-[0.68rem] font-medium uppercase tracking-normal text-brand-strong">
                                Owner
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {canRemoveCollaborator ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-md text-state-error hover:text-state-error"
                            aria-label={`Remove ${removeLabel}`}
                            title={`Remove ${removeLabel}`}
                            disabled={isRemoving}
                            onClick={() => {
                              if (collaboratorEmail !== null) {
                                void removeCollaborator(collaboratorEmail)
                              }
                            }}
                          >
                            {isRemoving ? (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            )}
                          </Button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          {errorMessage ? (
            <p className="text-xs text-state-error">{errorMessage}</p>
          ) : null}
        </div>
      </EditorDialogPattern>
    </Dialog>
  )
}

export { ShareDialog }
