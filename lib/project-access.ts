import "server-only"

import { auth, currentUser } from "@clerk/nextjs/server"

import type { Prisma, Project } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"

interface ProjectAccessIdentity {
  userId: string
  primaryEmail: string | null
}

interface ProjectAccess {
  project: Project
  role: "owner" | "collaborator"
}

async function getCurrentProjectIdentity(): Promise<ProjectAccessIdentity | null> {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || userId === null) {
    return null
  }

  const user = await currentUser()

  return {
    userId,
    primaryEmail:
      user?.primaryEmailAddress?.emailAddress.toLowerCase() ?? null,
  }
}

async function getProjectAccessForIdentity(
  projectId: string,
  identity: ProjectAccessIdentity
): Promise<ProjectAccess | null> {
  const accessFilters: Prisma.ProjectWhereInput[] = [
    {
      ownerId: identity.userId,
    },
  ]

  if (identity.primaryEmail !== null) {
    accessFilters.push({
      collaborators: {
        some: {
          email: {
            equals: identity.primaryEmail,
            mode: "insensitive",
          },
        },
      },
    })
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: accessFilters,
    },
  })

  if (project === null) {
    return null
  }

  return {
    project,
    role:
      project.ownerId === identity.userId ? "owner" : "collaborator",
  }
}

export { getCurrentProjectIdentity, getProjectAccessForIdentity }
export type { ProjectAccess, ProjectAccessIdentity }
