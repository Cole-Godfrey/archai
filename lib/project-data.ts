import "server-only"

import { currentUser } from "@clerk/nextjs/server"

import type { Project } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { EditorProject, EditorProjectLists } from "@/types/project"

interface ProjectListUser {
  userId: string
  email: string | null
}

function emptyProjectLists(): EditorProjectLists {
  return {
    ownedProjects: [],
    sharedProjects: [],
  }
}

function formatUpdatedAt(updatedAt: Date) {
  const elapsedMs = Date.now() - updatedAt.getTime()
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000))

  if (elapsedMinutes < 1) {
    return "Updated just now"
  }

  if (elapsedMinutes < 60) {
    return `Updated ${elapsedMinutes}m ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)

  if (elapsedHours < 24) {
    return `Updated ${elapsedHours}h ago`
  }

  const elapsedDays = Math.floor(elapsedHours / 24)

  if (elapsedDays < 7) {
    return `Updated ${elapsedDays}d ago`
  }

  return `Updated ${updatedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`
}

function toEditorProject(
  project: Project,
  role: EditorProject["role"]
): EditorProject {
  return {
    id: project.id,
    name: project.name,
    roomId: project.id,
    role,
    updatedAtLabel: formatUpdatedAt(project.updatedAt),
  }
}

async function getEditorProjectListsForUser({
  userId,
  email,
}: ProjectListUser): Promise<EditorProjectLists> {
  const sharedProjectsQuery =
    email === null
      ? Promise.resolve([])
      : prisma.project.findMany({
          where: {
            NOT: {
              ownerId: userId,
            },
            collaborators: {
              some: {
                email: {
                  equals: email,
                  mode: "insensitive",
                },
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        })

  const [ownedProjects, sharedProjects] = await Promise.all([
    prisma.project.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    sharedProjectsQuery,
  ])

  return {
    ownedProjects: ownedProjects.map((project) =>
      toEditorProject(project, "owner")
    ),
    sharedProjects: sharedProjects.map((project) =>
      toEditorProject(project, "collaborator")
    ),
  }
}

async function getCurrentUserProjectLists(): Promise<EditorProjectLists> {
  const user = await currentUser()

  if (user === null) {
    return emptyProjectLists()
  }

  return getEditorProjectListsForUser({
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress.toLowerCase() ?? null,
  })
}

export { getCurrentUserProjectLists, getEditorProjectListsForUser }
