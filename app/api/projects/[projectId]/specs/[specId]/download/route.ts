import { get } from "@vercel/blob"

import {
  getCurrentProjectIdentity,
  getProjectAccessForIdentity,
} from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { forbiddenResponse, unauthorizedResponse } from "@/lib/project-api"
import { buildSpecFilename } from "@/lib/spec-filename"

interface ProjectSpecDownloadRouteContext {
  params: Promise<{
    projectId: string
    specId: string
  }>
}

function notFoundResponse(message: string) {
  return Response.json({ error: message }, { status: 404 })
}

function specStorageErrorResponse(message: string) {
  return Response.json({ error: message }, { status: 502 })
}

export async function GET(
  _request: Request,
  { params }: ProjectSpecDownloadRouteContext
) {
  const { projectId, specId } = await params

  const identity = await getCurrentProjectIdentity()

  if (identity === null) {
    return unauthorizedResponse()
  }

  // Verify project access before any spec lookup so a non-member can never learn
  // whether a spec exists.
  const access = await getProjectAccessForIdentity(projectId, identity)

  if (access === null) {
    return forbiddenResponse()
  }

  const spec = await prisma.projectSpec.findUnique({
    where: { id: specId },
  })

  // 404 both when the spec is missing and when it belongs to another project, so
  // the response never confirms specs outside the caller's project.
  if (spec === null || spec.projectId !== projectId) {
    return notFoundResponse("Spec was not found.")
  }

  const blob = await get(spec.filePath, {
    access: "private",
    useCache: false,
  })

  if (blob === null) {
    return notFoundResponse("Spec file was not found.")
  }

  if (blob.statusCode !== 200 || blob.stream === null) {
    return specStorageErrorResponse("Spec file could not be read.")
  }

  return new Response(blob.stream, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildSpecFilename(
        access.project.name,
        spec.id
      )}"`,
      // Private project data: never cache the spec in shared/proxy caches.
      "Cache-Control": "private, no-store",
    },
  })
}
