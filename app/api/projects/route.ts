import { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  conflictResponse,
  getAuthenticatedProjectUser,
  getCreateProjectData,
  parseJsonBody,
  serializeProject,
  unauthorizedResponse,
} from "@/lib/project-api"

export async function GET() {
  const user = await getAuthenticatedProjectUser()

  if (user === null) {
    return unauthorizedResponse()
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: user.userId },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({
    projects: projects.map(serializeProject),
  })
}

export async function POST(request: Request) {
  const user = await getAuthenticatedProjectUser()

  if (user === null) {
    return unauthorizedResponse()
  }

  const bodyResult = await parseJsonBody(request)

  if (bodyResult.response !== undefined) {
    return bodyResult.response
  }

  const createDataResult = getCreateProjectData(bodyResult.body)

  if (createDataResult.response !== undefined) {
    return createDataResult.response
  }

  try {
    const project = await prisma.project.create({
      data: {
        ...(createDataResult.data.id !== undefined
          ? { id: createDataResult.data.id }
          : {}),
        name: createDataResult.data.name,
        ownerId: user.userId,
      },
    })

    return Response.json(
      {
        project: serializeProject(project),
      },
      { status: 201 }
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return conflictResponse("Project ID already exists.")
    }

    throw error
  }
}
