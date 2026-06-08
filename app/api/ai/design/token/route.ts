import { auth } from "@trigger.dev/sdk"

import { parseRunId } from "@/lib/ai-design"
import { prisma } from "@/lib/prisma"
import {
  forbiddenResponse,
  getAuthenticatedProjectUser,
  parseJsonBody,
  unauthorizedResponse,
} from "@/lib/project-api"

export async function POST(request: Request) {
  const user = await getAuthenticatedProjectUser()

  if (user === null) {
    return unauthorizedResponse()
  }

  const bodyResult = await parseJsonBody(request)

  if (bodyResult.response !== undefined) {
    return bodyResult.response
  }

  const runIdResult = parseRunId(bodyResult.body)

  if (runIdResult.response !== undefined) {
    return runIdResult.response
  }

  const { runId } = runIdResult

  const taskRun = await prisma.taskRun.findUnique({
    where: { runId },
  })

  if (taskRun === null || taskRun.userId !== user.userId) {
    return forbiddenResponse()
  }

  const token = await auth.createPublicToken({
    scopes: {
      read: {
        runs: [runId],
      },
    },
    expirationTime: "1h",
  })

  return Response.json({ token })
}
