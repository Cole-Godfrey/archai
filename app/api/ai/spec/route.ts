import { runs, tasks } from "@trigger.dev/sdk"

import type { generateSpec } from "@/trigger/generate-spec"
import { parseSpecRequest } from "@/lib/ai-spec"
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

  const specRequest = parseSpecRequest(bodyResult.body)

  if (specRequest.response !== undefined) {
    return specRequest.response
  }

  const { roomId, chatHistory, nodes, edges } = specRequest.data

  // Project access is resolved from the room id only. Project ids are room ids
  // for editor workspaces, so a client-supplied project id is never trusted.
  const access = await getProjectAccessForIdentity(roomId, identity)

  if (access === null) {
    return forbiddenResponse()
  }

  const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
    projectId: access.project.id,
    roomId,
    chatHistory,
    nodes,
    edges,
  })

  // Persist the run→owner mapping. If this write fails after the trigger,
  // cancel the run so it cannot execute without a DB record — otherwise it
  // would be an orphaned run with no ownership mapping for token issuance.
  try {
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: access.project.id,
        userId: identity.userId,
      },
    })
  } catch (error) {
    await runs.cancel(handle.id).catch(() => {})
    throw error
  }

  return Response.json({ runId: handle.id }, { status: 202 })
}
