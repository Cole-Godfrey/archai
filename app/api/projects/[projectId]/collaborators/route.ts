import { Prisma } from "@/app/generated/prisma/client"
import {
  getClerkUserEmailsById,
  getSerializedProjectAccessMembers,
  normalizeCollaboratorEmail,
  serializeProjectCollaborators,
} from "@/lib/project-collaborators"
import { prisma } from "@/lib/prisma"
import {
  badRequestResponse,
  conflictResponse,
  forbiddenResponse,
  parseJsonBody,
  unauthorizedResponse,
} from "@/lib/project-api"
import {
  getCurrentProjectIdentity,
  getProjectAccessForIdentity,
  type ProjectAccess,
  type ProjectAccessIdentity,
} from "@/lib/project-access"

interface ProjectCollaboratorsRouteContext {
  params: Promise<{
    projectId: string
  }>
}

interface CollaboratorEmailParseResult {
  email: string
  response?: never
}

interface CollaboratorEmailParseFailure {
  email?: never
  response: Response
}

const MAX_COLLABORATOR_EMAIL_LENGTH = 320
const COLLABORATOR_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function getProjectAccess(
  projectId: string
): Promise<
  | {
      access: ProjectAccess
      identity: ProjectAccessIdentity
      response?: never
    }
  | {
      access?: never
      identity?: never
      response: Response
    }
> {
  const identity = await getCurrentProjectIdentity()

  if (identity === null) {
    return { response: unauthorizedResponse() }
  }

  const access = await getProjectAccessForIdentity(projectId, identity)

  if (access === null) {
    return { response: forbiddenResponse() }
  }

  return {
    access,
    identity,
  }
}

function parseCollaboratorEmail(
  body: Record<string, unknown>
): CollaboratorEmailParseResult | CollaboratorEmailParseFailure {
  const email = body.email

  if (typeof email !== "string") {
    return { response: badRequestResponse("Collaborator email is required.") }
  }

  const normalizedEmail = normalizeCollaboratorEmail(email)

  if (
    normalizedEmail.length === 0 ||
    normalizedEmail.length > MAX_COLLABORATOR_EMAIL_LENGTH ||
    !COLLABORATOR_EMAIL_PATTERN.test(normalizedEmail)
  ) {
    return { response: badRequestResponse("Enter a valid email address.") }
  }

  return { email: normalizedEmail }
}

function requireProjectOwner(access: ProjectAccess) {
  if (access.role !== "owner") {
    return forbiddenResponse()
  }

  return null
}

async function getNormalizedOwnerEmails(
  access: ProjectAccess,
  identity: ProjectAccessIdentity
) {
  const ownerEmails = new Set(
    await getClerkUserEmailsById(access.project.ownerId)
  )

  if (identity.primaryEmail !== null) {
    ownerEmails.add(normalizeCollaboratorEmail(identity.primaryEmail))
  }

  return ownerEmails
}

export async function GET(
  _request: Request,
  { params }: ProjectCollaboratorsRouteContext
) {
  const { projectId } = await params
  const accessResult = await getProjectAccess(projectId)

  if (accessResult.response !== undefined) {
    return accessResult.response
  }

  const collaborators = await getSerializedProjectAccessMembers(
    accessResult.access.project
  )

  return Response.json({
    accessRole: accessResult.access.role,
    collaborators,
  })
}

export async function POST(
  request: Request,
  { params }: ProjectCollaboratorsRouteContext
) {
  const { projectId } = await params
  const accessResult = await getProjectAccess(projectId)

  if (accessResult.response !== undefined) {
    return accessResult.response
  }

  const ownerResponse = requireProjectOwner(accessResult.access)

  if (ownerResponse !== null) {
    return ownerResponse
  }

  const bodyResult = await parseJsonBody(request)

  if (bodyResult.response !== undefined) {
    return bodyResult.response
  }

  const emailResult = parseCollaboratorEmail(bodyResult.body)

  if (emailResult.response !== undefined) {
    return emailResult.response
  }

  const ownerEmails = await getNormalizedOwnerEmails(
    accessResult.access,
    accessResult.identity
  )

  if (ownerEmails.has(emailResult.email)) {
    return badRequestResponse("Project owners already have access.")
  }

  try {
    const collaborator = await prisma.projectCollaborator.create({
      data: {
        projectId,
        email: emailResult.email,
      },
    })
    const [serializedCollaborator] = await serializeProjectCollaborators([
      collaborator,
    ])

    return Response.json(
      {
        collaborator: serializedCollaborator,
      },
      { status: 201 }
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return conflictResponse("Collaborator already has access.")
    }

    throw error
  }
}

export async function DELETE(
  request: Request,
  { params }: ProjectCollaboratorsRouteContext
) {
  const { projectId } = await params
  const accessResult = await getProjectAccess(projectId)

  if (accessResult.response !== undefined) {
    return accessResult.response
  }

  const ownerResponse = requireProjectOwner(accessResult.access)

  if (ownerResponse !== null) {
    return ownerResponse
  }

  const bodyResult = await parseJsonBody(request)

  if (bodyResult.response !== undefined) {
    return bodyResult.response
  }

  const emailResult = parseCollaboratorEmail(bodyResult.body)

  if (emailResult.response !== undefined) {
    return emailResult.response
  }

  const deleteResult = await prisma.projectCollaborator.deleteMany({
    where: {
      projectId,
      email: emailResult.email,
    },
  })

  if (deleteResult.count === 0) {
    return badRequestResponse("Collaborator was not found.")
  }

  return Response.json({
    success: true,
    email: emailResult.email,
  })
}
