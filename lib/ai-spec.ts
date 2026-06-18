import { badRequestResponse } from "@/lib/project-api"

/**
 * Parsed `POST /api/ai/spec` request body. Deliberately omits any project id:
 * project access is resolved from `roomId` alone (project ids are room ids for
 * editor workspaces), so a client-supplied project id is never trusted.
 *
 * `chatHistory`, `nodes`, and `edges` are validated here only as arrays; the
 * `generate-spec` task is the authoritative validator (Zod + the shared canvas
 * snapshot normalizer) for their element shapes.
 */
interface SpecRequest {
  roomId: string
  chatHistory: unknown[]
  nodes: unknown[]
  edges: unknown[]
}

interface SpecRequestParseResult {
  data: SpecRequest
  response?: never
}

interface SpecRequestParseFailure {
  data?: never
  response: Response
}

function getRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function parseSpecRequest(
  body: Record<string, unknown>
): SpecRequestParseResult | SpecRequestParseFailure {
  const roomId = getRequiredString(body.roomId)

  if (roomId === null) {
    return { response: badRequestResponse("Room ID is required.") }
  }

  if (!Array.isArray(body.chatHistory)) {
    return { response: badRequestResponse("Chat history must be an array.") }
  }

  if (!Array.isArray(body.nodes)) {
    return { response: badRequestResponse("Canvas nodes must be an array.") }
  }

  if (!Array.isArray(body.edges)) {
    return { response: badRequestResponse("Canvas edges must be an array.") }
  }

  return {
    data: {
      roomId,
      chatHistory: body.chatHistory,
      nodes: body.nodes,
      edges: body.edges,
    },
  }
}

export { parseSpecRequest }
export type { SpecRequest }
