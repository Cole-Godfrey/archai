import { badRequestResponse } from "@/lib/project-api"

interface DesignRequest {
  prompt: string
  roomId: string
  projectId: string
  viewportCenter?: { x: number; y: number }
}

interface DesignRequestParseResult {
  data: DesignRequest
  response?: never
}

interface DesignRequestParseFailure {
  data?: never
  response: Response
}

interface RunIdParseResult {
  runId: string
  response?: never
}

interface RunIdParseFailure {
  runId?: never
  response: Response
}

function getRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

// Optional: the sender's canvas viewport center in flow coordinates, used to
// place a generated design where they are looking. Absent/invalid values fall
// back to the default placement, so this never fails the request.
function getOptionalViewportCenter(
  value: unknown
): { x: number; y: number } | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined
  }

  const { x, y } = value as Record<string, unknown>

  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return undefined
  }

  return { x, y }
}

function parseDesignRequest(
  body: Record<string, unknown>
): DesignRequestParseResult | DesignRequestParseFailure {
  const prompt = getRequiredString(body.prompt)

  if (prompt === null) {
    return { response: badRequestResponse("Design prompt is required.") }
  }

  const roomId = getRequiredString(body.roomId)

  if (roomId === null) {
    return { response: badRequestResponse("Room ID is required.") }
  }

  const projectId = getRequiredString(body.projectId)

  if (projectId === null) {
    return { response: badRequestResponse("Project ID is required.") }
  }

  const viewportCenter = getOptionalViewportCenter(body.viewportCenter)

  return { data: { prompt, roomId, projectId, viewportCenter } }
}

function parseRunId(
  body: Record<string, unknown>
): RunIdParseResult | RunIdParseFailure {
  const runId = getRequiredString(body.runId)

  if (runId === null) {
    return { response: badRequestResponse("Run ID is required.") }
  }

  return { runId }
}

export { parseDesignRequest, parseRunId }
export type { DesignRequest }
