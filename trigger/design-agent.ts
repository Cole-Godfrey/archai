import { mutateFlow } from "@liveblocks/react-flow/node"
import { logger, task } from "@trigger.dev/sdk"

import {
  applyPreparedPlan,
  generateDesignPlan,
  getDesignGenerationDiagnostics,
  prepareDesignPlan,
  type PreparedDesignPlan,
} from "@/lib/design-generation"
import {
  getAgentLiveblocksClient,
  publishAgentPresence,
} from "@/lib/liveblocks-agent"
import type { CanvasEdge, CanvasNode, CanvasSnapshot } from "@/types/canvas"

interface DesignAgentPayload {
  prompt: string
  roomId: string
  viewportCenter?: { x: number; y: number }
}

/** Reads the current canvas via the same Liveblocks flow storage the editor uses. */
async function readExistingFlow(roomId: string): Promise<CanvasSnapshot> {
  const client = getAgentLiveblocksClient()
  let snapshot: CanvasSnapshot = { nodes: [], edges: [] }

  await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
    snapshot = { nodes: [...flow.nodes], edges: [...flow.edges] }
  })

  return snapshot
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

function buildDesigningMessage(prepared: PreparedDesignPlan): string {
  const parts: string[] = []

  if (prepared.addedNodeCount > 0) {
    parts.push(pluralize(prepared.addedNodeCount, "component"))
  }
  if (prepared.addedEdgeCount > 0) {
    parts.push(pluralize(prepared.addedEdgeCount, "connection"))
  }

  return parts.length === 0
    ? "Updating the canvas…"
    : `Placing ${parts.join(" and ")}…`
}

function buildCompleteMessage(prepared: PreparedDesignPlan): string {
  if (prepared.summary.length > 0) {
    return prepared.summary
  }

  const total =
    prepared.addedNodeCount +
    prepared.addedEdgeCount +
    prepared.updatedCount +
    prepared.removedCount

  return total === 0 ? "No changes were needed." : "Design updated."
}

/**
 * Generates a system design from a prompt and writes it onto the shared
 * collaborative canvas. Interprets the prompt with Gemini, lays the result out
 * on the existing Liveblocks flow storage, and publishes AI presence and
 * status to every participant at each step.
 *
 * Retries are disabled: generation runs before any canvas write, so a failure
 * leaves the canvas untouched, and a retry would otherwise append a second,
 * different design to a shared room.
 * See context/feature-specs/23-design-agent-logic.md.
 */
export const designAgentTask = task({
  id: "design-agent",
  retry: { maxAttempts: 1 },
  run: async (payload: DesignAgentPayload) => {
    const { prompt, roomId, viewportCenter } = payload

    await publishAgentPresence(
      roomId,
      { phase: "thinking", message: "Reading your prompt…" },
      null
    )

    // Tracks whether the canvas write has landed. Once it has, later failures
    // must not fail the run — the design is already on the shared canvas.
    let writeCommitted = false

    try {
      const existing = await readExistingFlow(roomId)
      const plan = await generateDesignPlan(prompt, existing, viewportCenter)
      const prepared = prepareDesignPlan(existing, plan)

      logger.info("Design plan prepared", {
        roomId,
        addedNodes: prepared.addedNodeCount,
        addedEdges: prepared.addedEdgeCount,
        updated: prepared.updatedCount,
        removed: prepared.removedCount,
      })

      await publishAgentPresence(
        roomId,
        { phase: "designing", message: buildDesigningMessage(prepared) },
        prepared.centroid
      )

      const client = getAgentLiveblocksClient()

      await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
        applyPreparedPlan(flow, prepared)
      })

      // The canvas write has committed; the design is now live for everyone.
      writeCommitted = true

      // Presence is best-effort from here: swallow failures so a presence error
      // can't mark the run failed after the canvas already changed.
      await publishAgentPresence(
        roomId,
        { phase: "complete", message: buildCompleteMessage(prepared) },
        prepared.centroid
      ).catch((presenceError) => {
        logger.error("Design agent failed to publish completion presence", {
          roomId,
          error:
            presenceError instanceof Error
              ? presenceError.message
              : "Unknown error",
        })
      })

      return {
        summary: prepared.summary,
        addedNodes: prepared.addedNodeCount,
        addedEdges: prepared.addedEdgeCount,
        updated: prepared.updatedCount,
        removed: prepared.removedCount,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"

      // If the canvas already committed, the design landed; record the failure
      // but let the run succeed instead of telling participants nothing changed.
      if (writeCommitted) {
        logger.error("Design agent post-write step failed", {
          roomId,
          error: message,
        })
        return
      }

      const diagnostics = getDesignGenerationDiagnostics(error)

      if (diagnostics !== null) {
        logger.error("Design generation invalid Gemini output", {
          roomId,
          diagnostics,
        })
      }

      logger.error("Design agent failed", { roomId, error: message })

      // Surface the failure to participants without breaking the canvas, then
      // re-throw so the run is recorded as failed.
      await publishAgentPresence(
        roomId,
        {
          phase: "error",
          message: "Design generation failed. The canvas was not changed.",
        },
        null
      ).catch(() => {})

      throw error
    }
  },
})
