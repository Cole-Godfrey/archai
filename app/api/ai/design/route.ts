import { tasks } from "@trigger.dev/sdk"

import type { designAgentTask } from "@/trigger/design-agent"
import { parseDesignRequest } from "@/lib/ai-design"
import {
  getCurrentProjectIdentity,
  getProjectAccessForIdentity,
} from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import {
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

  const access = await getProjectAccessForIdentity(projectId, identity)

  if (access === null) {
    return forbiddenResponse()
  }

  const handle = await tasks.trigger<typeof designAgentTask>("design-agent", {
    prompt,
    roomId,
    viewportCenter,
  })

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId,
      userId: identity.userId,
    },
  })

  return Response.json({ runId: handle.id }, { status: 202 })
}
