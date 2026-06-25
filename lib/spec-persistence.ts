import { randomUUID } from "node:crypto"

import { put } from "@vercel/blob"

import { prisma } from "@/lib/prisma"

interface PersistedSpec {
  id: string
  projectId: string
  filePath: string
}

/**
 * Persists a generated Markdown spec using the same layering as canvas
 * persistence: the Markdown content lives in Vercel Blob
 * (`specs/{projectId}/{specId}.md`) and Prisma stores only the blob URL
 * reference in `ProjectSpec.filePath` — never the content itself. See
 * context/architecture-context.md (storage model).
 *
 * The blob is uploaded first and only then is the metadata row created, so a
 * failed upload never leaves a dangling database record. The spec id is
 * generated up front so the blob path and the `ProjectSpec.id` match.
 */
async function persistGeneratedSpec(
  projectId: string,
  markdown: string
): Promise<PersistedSpec> {
  const specId = randomUUID()

  const blob = await put(`specs/${projectId}/${specId}.md`, markdown, {
    access: "private",
    contentType: "text/markdown",
  })

  const spec = await prisma.projectSpec.create({
    data: {
      id: specId,
      projectId,
      filePath: blob.url,
    },
  })

  return {
    id: spec.id,
    projectId: spec.projectId,
    filePath: spec.filePath,
  }
}

export { persistGeneratedSpec }
export type { PersistedSpec }
