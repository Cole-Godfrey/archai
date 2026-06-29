import {
  getCurrentProjectIdentity,
  getProjectAccessForIdentity,
} from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { forbiddenResponse, unauthorizedResponse } from "@/lib/project-api"
import { buildSpecFilename } from "@/lib/spec-filename"

interface ProjectSpecsRouteContext {
  params: Promise<{
    projectId: string
  }>
}

export async function GET(
  _request: Request,
  { params }: ProjectSpecsRouteContext
) {
  const { projectId } = await params
  const identity = await getCurrentProjectIdentity()

  if (identity === null) {
    return unauthorizedResponse()
  }

  const access = await getProjectAccessForIdentity(projectId, identity)

  if (access === null) {
    return forbiddenResponse()
  }

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
    },
  })

  return Response.json({
    specs: specs.map((spec) => ({
      id: spec.id,
      createdAt: spec.createdAt.toISOString(),
      filename: buildSpecFilename(access.project.name, spec.id),
    })),
  })
}
