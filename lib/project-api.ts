import { auth } from "@clerk/nextjs/server"

import type { Project } from "@/app/generated/prisma/client"

const DEFAULT_PROJECT_NAME = "Untitled Project"
const MAX_PROJECT_ID_LENGTH = 80
const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

interface AuthenticatedProjectUser {
  userId: string
}

interface ProjectJson {
  id: string
  ownerId: string
  name: string
  description: string | null
  status: Project["status"]
  canvasJsonPath: string | null
  createdAt: string
  updatedAt: string
}

interface JsonBodyParseResult {
  body: Record<string, unknown>
  response?: never
}

interface JsonBodyParseFailure {
  body?: never
  response: Response
}

interface ProjectNameParseResult {
  name: string
  response?: never
}

interface ProjectNameParseFailure {
  name?: never
  response: Response
}

interface CreateProjectData {
  id?: string
  name: string
}

interface CreateProjectDataParseResult {
  data: CreateProjectData
  response?: never
}

interface CreateProjectDataParseFailure {
  data?: never
  response: Response
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

function unauthorizedResponse() {
  return jsonError("Unauthorized", 401)
}

function forbiddenResponse() {
  return jsonError("Forbidden", 403)
}

function badRequestResponse(message: string) {
  return jsonError(message, 400)
}

function conflictResponse(message: string) {
  return jsonError(message, 409)
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

async function getAuthenticatedProjectUser(): Promise<
  AuthenticatedProjectUser | null
> {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || userId === null) {
    return null
  }

  return { userId }
}

async function parseJsonBody(
  request: Request
): Promise<JsonBodyParseResult | JsonBodyParseFailure> {
  const bodyText = await request.text()

  if (bodyText.trim().length === 0) {
    return { body: {} }
  }

  let parsedBody: unknown

  try {
    parsedBody = JSON.parse(bodyText)
  } catch {
    return { response: badRequestResponse("Request body must be valid JSON.") }
  }

  if (!isJsonObject(parsedBody)) {
    return {
      response: badRequestResponse("Request body must be a JSON object."),
    }
  }

  return { body: parsedBody }
}

function getCreateProjectName(
  body: Record<string, unknown>
): ProjectNameParseResult | ProjectNameParseFailure {
  const projectName = body.name

  if (projectName === undefined || projectName === null) {
    return { name: DEFAULT_PROJECT_NAME }
  }

  if (typeof projectName !== "string") {
    return { response: badRequestResponse("Project name must be a string.") }
  }

  const trimmedName = projectName.trim()

  return {
    name: trimmedName.length > 0 ? trimmedName : DEFAULT_PROJECT_NAME,
  }
}

function getCreateProjectData(
  body: Record<string, unknown>
): CreateProjectDataParseResult | CreateProjectDataParseFailure {
  const nameResult = getCreateProjectName(body)

  if (nameResult.response !== undefined) {
    return { response: nameResult.response }
  }

  const projectId = body.id

  if (projectId === undefined || projectId === null) {
    return {
      data: {
        name: nameResult.name,
      },
    }
  }

  if (typeof projectId !== "string") {
    return { response: badRequestResponse("Project ID must be a string.") }
  }

  const trimmedProjectId = projectId.trim()

  if (
    trimmedProjectId.length === 0 ||
    trimmedProjectId.length > MAX_PROJECT_ID_LENGTH ||
    !PROJECT_ID_PATTERN.test(trimmedProjectId)
  ) {
    return {
      response: badRequestResponse(
        "Project ID must use lowercase letters, numbers, and hyphens."
      ),
    }
  }

  return {
    data: {
      id: trimmedProjectId,
      name: nameResult.name,
    },
  }
}

function getRenameProjectName(
  body: Record<string, unknown>
): ProjectNameParseResult | ProjectNameParseFailure {
  const projectName = body.name

  if (typeof projectName !== "string") {
    return { response: badRequestResponse("Project name must be a string.") }
  }

  const trimmedName = projectName.trim()

  if (trimmedName.length === 0) {
    return { response: badRequestResponse("Project name is required.") }
  }

  return { name: trimmedName }
}

function serializeProject(project: Project): ProjectJson {
  return {
    id: project.id,
    ownerId: project.ownerId,
    name: project.name,
    description: project.description,
    status: project.status,
    canvasJsonPath: project.canvasJsonPath,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }
}

export {
  badRequestResponse,
  conflictResponse,
  forbiddenResponse,
  getAuthenticatedProjectUser,
  getCreateProjectData,
  getCreateProjectName,
  getRenameProjectName,
  parseJsonBody,
  serializeProject,
  unauthorizedResponse,
}
export type { ProjectJson }
