import { AbortTaskRunError, logger, metadata, task } from "@trigger.dev/sdk"

import { parseCanvasSnapshot } from "@/lib/canvas-snapshot"
import {
  generateSpecInputSchema,
  generateSpecMarkdown,
} from "@/lib/spec-generation"
import { persistGeneratedSpec } from "@/lib/spec-persistence"

interface GenerateSpecPayload {
  projectId: string
  roomId: string
  chatHistory: unknown[]
  nodes: unknown[]
  edges: unknown[]
}

/** Publishes a coarse run status + human-readable message for realtime tracking. */
function setStatus(status: string, message: string): void {
  metadata.set("status", status).set("message", message)
}

/**
 * Generates a Markdown technical specification from a project's canvas graph and
 * chat discussion with Gemini, persists it (Vercel Blob holds the content, a
 * `ProjectSpec` row holds the metadata), and returns `{ specId, markdown }` so
 * the requesting client can read the spec via Trigger.dev Realtime and link to
 * its download route. Run metadata is updated at each phase so a realtime
 * subscriber can show progress. See
 * context/feature-specs/28-spec-persistence-download.md.
 *
 * Retries (maxAttempts: 3) stay safe even with persistence: each attempt uses a
 * fresh spec id, the blob upload runs before the metadata write, and the run
 * returns immediately after a successful `ProjectSpec.create`. So a run produces
 * exactly one persisted record on success; a failed attempt leaves at most an
 * unreferenced blob (no database row), never a duplicate spec.
 */
export const generateSpec = task({
  id: "generate-spec",
  retry: {
    maxAttempts: 3,
    factor: 1.8,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
  run: async (payload: GenerateSpecPayload) => {
    try {
      setStatus("preparing", "Reading the canvas and conversation…")

      const input = generateSpecInputSchema.safeParse(payload)

      if (!input.success) {
        const issues = input.error.issues
          .map(
            (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
          )
          .join("; ")

        throw new AbortTaskRunError(
          `Spec generation input is invalid: ${issues}`
        )
      }

      const snapshot = parseCanvasSnapshot({
        nodes: input.data.nodes,
        edges: input.data.edges,
      })

      if (snapshot === null) {
        throw new AbortTaskRunError(
          "Spec generation received invalid canvas nodes or edges."
        )
      }

      logger.info("Spec generation started", {
        projectId: input.data.projectId,
        roomId: input.data.roomId,
        nodeCount: snapshot.nodes.length,
        edgeCount: snapshot.edges.length,
        messageCount: input.data.chatHistory.length,
      })

      setStatus("generating", "Writing the technical specification…")

      const markdown = await generateSpecMarkdown(
        snapshot,
        input.data.chatHistory
      )

      setStatus("saving", "Saving the specification…")

      const spec = await persistGeneratedSpec(input.data.projectId, markdown)

      setStatus("completed", "Specification ready.")

      logger.info("Spec generation completed", {
        projectId: input.data.projectId,
        roomId: input.data.roomId,
        specId: spec.id,
        specLength: markdown.length,
      })

      return { specId: spec.id, markdown }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"

      setStatus("failed", "Spec generation failed.")

      logger.error("Spec generation failed", {
        projectId: payload.projectId,
        roomId: payload.roomId,
        error: message,
      })

      throw error
    }
  },
})
