import { runs, tasks } from "@trigger.dev/sdk"

import type { designAgentTask } from "@/trigger/design-agent"
import { parseDesignRequest } from "@/lib/ai-design"
import {
  getCurrentProjectIdentity,
  getProjectAccessForIdentity,
} from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import {
  badRequestResponse,
  forbiddenResponse,
  parseJsonBody,
  unauthorizedResponse,
} from "@/lib/project-api"

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity()

  if (identity === null) {
    return unauthorizedResponse()
  }

  const bodyResult = await parseJsonBody(request)

  if (bodyResult.response !== undefined) {
    return bodyResult.response
  }

  const designRequest = parseDesignRequest(bodyResult.body)

  if (designRequest.response !== undefined) {
    return designRequest.response
  }

  const { prompt, roomId, projectId, viewportCenter } = designRequest.data

  if (roomId !== projectId) {
    return badRequestResponse("Project ID and room ID must match.")
  }

  const access = await getProjectAccessForIdentity(roomId, identity)

  if (access === null) {
    return forbiddenResponse()
  }

  const authorizedProjectId = access.project.id

  const handle = await tasks.trigger<typeof designAgentTask>("design-agent", {
    prompt,
    roomId: authorizedProjectId,
    viewportCenter,
  })

  try {
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: authorizedProjectId,
        userId: identity.userId,
      },
    })
  } catch (error) {
    await runs.cancel(handle.id).catch(() => {})
    throw error
  }

  return Response.json({ runId: handle.id }, { status: 202 })
}
