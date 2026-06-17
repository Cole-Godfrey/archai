import { logger, metadata, task } from "@trigger.dev/sdk"

import { parseCanvasSnapshot } from "@/lib/canvas-snapshot"
import {
  generateSpecInputSchema,
  generateSpecMarkdown,
} from "@/lib/spec-generation"

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
 * chat discussion with Gemini, returning it as the task output for the
 * requesting client to read via Trigger.dev Realtime. Run metadata is updated at
 * each phase so a realtime subscriber can show progress.
 *
 * Unlike the design agent, retries are safe here: the task has no canvas or
 * database side effects — it only reads its payload, calls Gemini, and returns
 * Markdown — so a transient provider failure can be retried without duplicating
 * anything. See context/feature-specs/27-spec-generation-flow.md.
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

        throw new Error(`Spec generation input is invalid: ${issues}`)
      }

      const snapshot = parseCanvasSnapshot({
        nodes: input.data.nodes,
        edges: input.data.edges,
      })

      if (snapshot === null) {
        throw new Error(
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

      setStatus("completed", "Specification ready.")

      logger.info("Spec generation completed", {
        projectId: input.data.projectId,
        roomId: input.data.roomId,
        specLength: markdown.length,
      })

      return markdown
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
