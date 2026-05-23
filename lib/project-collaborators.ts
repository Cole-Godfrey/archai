import "server-only"

import { clerkClient } from "@clerk/nextjs/server"
import type { User } from "@clerk/backend"

import type { Project, ProjectCollaborator } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { ProjectCollaboratorSummary } from "@/types/share"

const CLERK_USER_LOOKUP_BATCH_SIZE = 100

function normalizeCollaboratorEmail(email: string) {
  return email.trim().toLowerCase()
}

function getUserDisplayName(user: User) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ")

  if (fullName.length > 0) {
    return fullName
  }

  return user.username
}

function mapUsersByEmail(users: User[]) {
  const usersByEmail = new Map<string, User>()

  for (const user of users) {
    for (const email of getUserEmails(user)) {
      usersByEmail.set(email, user)
    }
  }

  return usersByEmail
}

function getUserEmails(user: User) {
  return user.emailAddresses.map((emailAddress) =>
    normalizeCollaboratorEmail(emailAddress.emailAddress)
  )
}

function getUserPrimaryEmail(user: User) {
  const primaryEmail =
    user.emailAddresses.find(
      (emailAddress) => emailAddress.id === user.primaryEmailAddressId
    ) ?? user.emailAddresses.at(0)

  return primaryEmail === undefined
    ? null
    : normalizeCollaboratorEmail(primaryEmail.emailAddress)
}

async function getClerkUserById(userId: string) {
  try {
    const client = await clerkClient()

    return await client.users.getUser(userId)
  } catch {
    return null
  }
}

async function getClerkUserEmailsById(userId: string) {
  const user = await getClerkUserById(userId)

  return user === null ? [] : getUserEmails(user)
}

async function getClerkUsersByEmail(emails: string[]) {
  const uniqueEmails = Array.from(
    new Set(emails.map(normalizeCollaboratorEmail))
  )
  const users: User[] = []

  if (uniqueEmails.length === 0) {
    return new Map<string, User>()
  }

  try {
    const client = await clerkClient()

    for (
      let index = 0;
      index < uniqueEmails.length;
      index += CLERK_USER_LOOKUP_BATCH_SIZE
    ) {
      const emailBatch = uniqueEmails.slice(
        index,
        index + CLERK_USER_LOOKUP_BATCH_SIZE
      )
      const result = await client.users.getUserList({
        emailAddress: emailBatch,
        limit: emailBatch.length,
      })

      users.push(...result.data)
    }
  } catch {
    return new Map<string, User>()
  }

  return mapUsersByEmail(users)
}

async function getSerializedProjectAccessMembers(
  project: Pick<Project, "id" | "ownerId" | "createdAt">
): Promise<ProjectCollaboratorSummary[]> {
  const [ownerUser, collaborators] = await Promise.all([
    getClerkUserById(project.ownerId),
    prisma.projectCollaborator.findMany({
      where: {
        projectId: project.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ])
  const serializedCollaborators = await serializeProjectCollaborators(
    collaborators
  )
  const ownerEmail = ownerUser === null ? null : getUserPrimaryEmail(ownerUser)
  const ownerMember: ProjectCollaboratorSummary = {
    id: `owner:${project.ownerId}`,
    role: "owner",
    email: ownerEmail,
    displayName:
      ownerUser === null ? "Project owner" : getUserDisplayName(ownerUser),
    avatarUrl: ownerUser?.imageUrl ?? null,
    createdAt: project.createdAt.toISOString(),
  }

  return [ownerMember, ...serializedCollaborators]
}

async function getSerializedProjectCollaborators(
  projectId: string
): Promise<ProjectCollaboratorSummary[]> {
  const collaborators = await prisma.projectCollaborator.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  return serializeProjectCollaborators(collaborators)
}

async function serializeProjectCollaborators(
  collaborators: ProjectCollaborator[]
): Promise<ProjectCollaboratorSummary[]> {
  const usersByEmail = await getClerkUsersByEmail(
    collaborators.map((collaborator) => collaborator.email)
  )

  return collaborators.map((collaborator) => {
    const email = normalizeCollaboratorEmail(collaborator.email)
    const user = usersByEmail.get(email)

    return {
      id: `collaborator:${email}`,
      role: "collaborator",
      email,
      displayName: user === undefined ? null : getUserDisplayName(user),
      avatarUrl: user?.imageUrl ?? null,
      createdAt: collaborator.createdAt.toISOString(),
    }
  })
}

export {
  getClerkUserEmailsById,
  getSerializedProjectAccessMembers,
  getSerializedProjectCollaborators,
  normalizeCollaboratorEmail,
  serializeProjectCollaborators,
}
