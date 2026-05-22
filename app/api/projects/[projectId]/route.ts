import { prisma } from "@/lib/prisma"
import {
  forbiddenResponse,
  getAuthenticatedProjectUser,
  getRenameProjectName,
  parseJsonBody,
  serializeProject,
  unauthorizedResponse,
} from "@/lib/project-api"

interface ProjectRouteContext {
  params: Promise<{
    projectId: string
  }>
}

export async function PATCH(
  request: Request,
  { params }: ProjectRouteContext
) {
  const user = await getAuthenticatedProjectUser()

  if (user === null) {
    return unauthorizedResponse()
  }

  const bodyResult = await parseJsonBody(request)

  if (bodyResult.response !== undefined) {
    return bodyResult.response
  }

  const nameResult = getRenameProjectName(bodyResult.body)

  if (nameResult.response !== undefined) {
    return nameResult.response
  }

  const { projectId } = await params
  const updatedProjects = await prisma.project.updateManyAndReturn({
    where: {
      id: projectId,
      ownerId: user.userId,
    },
    data: {
      name: nameResult.name,
    },
  })
  const updatedProject = updatedProjects.at(0)

  if (updatedProject === undefined) {
    return forbiddenResponse()
  }

  return Response.json({
    project: serializeProject(updatedProject),
  })
}

export async function DELETE(_request: Request, { params }: ProjectRouteContext) {
  const user = await getAuthenticatedProjectUser()

  if (user === null) {
    return unauthorizedResponse()
  }

  const { projectId } = await params
  const deleteResult = await prisma.project.deleteMany({
    where: {
      id: projectId,
      ownerId: user.userId,
    },
  })

  if (deleteResult.count === 0) {
    return forbiddenResponse()
  }

  return Response.json({ success: true })
}
