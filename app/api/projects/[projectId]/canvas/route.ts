import { get, put } from "@vercel/blob"

import { parseCanvasSnapshot } from "@/lib/canvas-snapshot"
import {
  getCurrentProjectIdentity,
  getProjectAccessForIdentity,
  type ProjectAccess,
} from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import {
  badRequestResponse,
  forbiddenResponse,
  parseJsonBody,
  unauthorizedResponse,
} from "@/lib/project-api"

interface ProjectCanvasRouteContext {
  params: Promise<{
    projectId: string
  }>
}

interface ProjectAccessResult {
  access: ProjectAccess
  response?: never
}

interface ProjectAccessFailure {
  access?: never
  response: Response
}

function canvasStorageErrorResponse(message: string) {
  return Response.json({ error: message }, { status: 502 })
}

async function getProjectAccess(
  projectId: string
): Promise<ProjectAccessResult | ProjectAccessFailure> {
  const identity = await getCurrentProjectIdentity()

  if (identity === null) {
    return { response: unauthorizedResponse() }
  }

  const access = await getProjectAccessForIdentity(projectId, identity)

  if (access === null) {
    return { response: forbiddenResponse() }
  }

  return { access }
}

async function readSavedCanvas(canvasJsonPath: string) {
  const blob = await get(canvasJsonPath, {
    access: "private",
    useCache: false,
  })

  if (blob === null) {
    return {
      canvas: null,
      response: Response.json(
        { error: "Saved canvas was not found." },
        { status: 404 }
      ),
    }
  }

  if (blob.statusCode !== 200 || blob.stream === null) {
    return {
      canvas: null,
      response: canvasStorageErrorResponse("Saved canvas could not be read."),
    }
  }

  let savedCanvasJson: unknown

  try {
    savedCanvasJson = await new Response(blob.stream).json()
  } catch {
    return {
      canvas: null,
      response: canvasStorageErrorResponse("Saved canvas JSON is invalid."),
    }
  }

  const canvas = parseCanvasSnapshot(savedCanvasJson)

  if (canvas === null) {
    return {
      canvas: null,
      response: canvasStorageErrorResponse(
        "Saved canvas schema is invalid."
      ),
    }
  }

  return {
    canvas,
    response: null,
  }
}

export async function GET(
  _request: Request,
  { params }: ProjectCanvasRouteContext
) {
  const { projectId } = await params
  const accessResult = await getProjectAccess(projectId)

  if (accessResult.response !== undefined) {
    return accessResult.response
  }

  const canvasJsonPath = accessResult.access.project.canvasJsonPath

  if (canvasJsonPath === null) {
    return Response.json({ canvas: null })
  }

  const savedCanvas = await readSavedCanvas(canvasJsonPath)

  if (savedCanvas.response !== null) {
    return savedCanvas.response
  }

  return Response.json({ canvas: savedCanvas.canvas })
}

export async function PUT(
  request: Request,
  { params }: ProjectCanvasRouteContext
) {
  const { projectId } = await params
  const accessResult = await getProjectAccess(projectId)

  if (accessResult.response !== undefined) {
    return accessResult.response
  }

  const bodyResult = await parseJsonBody(request)

  if (bodyResult.response !== undefined) {
    return bodyResult.response
  }

  const canvas = parseCanvasSnapshot(bodyResult.body)

  if (canvas === null) {
    return badRequestResponse("Canvas JSON is invalid.")
  }

  const blob = await put(
    `canvas/${projectId}.json`,
    JSON.stringify(canvas),
    {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
    }
  )
  const [project] = await prisma.project.updateManyAndReturn({
    where: { id: projectId },
    data: {
      canvasJsonPath: blob.url,
    },
  })

  if (project === undefined) {
    return forbiddenResponse()
  }

  return Response.json({
    canvasJsonPath: project.canvasJsonPath,
  })
}
