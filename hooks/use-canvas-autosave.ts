"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createCanvasSnapshot } from "@/lib/canvas-snapshot"
import type {
  CanvasEdge,
  CanvasNode,
  CanvasSaveStatus,
} from "@/types/canvas"

interface UseCanvasAutosaveOptions {
  debounceMs?: number
  edges: CanvasEdge[]
  enabled: boolean
  nodes: CanvasNode[]
  projectId: string
  skipInitialSave?: boolean
}

interface UseCanvasAutosaveResult {
  saveNow: () => void
  status: CanvasSaveStatus
}

const DEFAULT_AUTOSAVE_DEBOUNCE_MS = 6000
const SAVE_FEEDBACK_RESET_MS = 1400

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function useCanvasAutosave({
  debounceMs = DEFAULT_AUTOSAVE_DEBOUNCE_MS,
  edges,
  enabled,
  nodes,
  projectId,
  skipInitialSave = false,
}: UseCanvasAutosaveOptions): UseCanvasAutosaveResult {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle")
  const activeSaveAbortController = useRef<AbortController | null>(null)
  const autosaveTimeoutId = useRef<number | null>(null)
  const lastSavedPayload = useRef<string | null>(null)
  const hasInitialized = useRef(false)
  const statusResetTimeoutId = useRef<number | null>(null)

  const snapshotPayload = useMemo(() => {
    return JSON.stringify(createCanvasSnapshot(nodes, edges))
  }, [edges, nodes])

  const clearAutosaveTimeout = useCallback(() => {
    if (autosaveTimeoutId.current === null) {
      return
    }

    window.clearTimeout(autosaveTimeoutId.current)
    autosaveTimeoutId.current = null
  }, [])

  const clearStatusResetTimeout = useCallback(() => {
    if (statusResetTimeoutId.current === null) {
      return
    }

    window.clearTimeout(statusResetTimeoutId.current)
    statusResetTimeoutId.current = null
  }, [])

  const queueStatusReset = useCallback(() => {
    clearStatusResetTimeout()
    statusResetTimeoutId.current = window.setTimeout(() => {
      statusResetTimeoutId.current = null
      setStatus((currentStatus) =>
        currentStatus === "saved" || currentStatus === "error"
          ? "idle"
          : currentStatus
      )
    }, SAVE_FEEDBACK_RESET_MS)
  }, [clearStatusResetTimeout])

  const savePayload = useCallback(
    (payload: string, options: { force?: boolean } = {}) => {
      if (!enabled || (!options.force && payload === lastSavedPayload.current)) {
        return
      }

      clearStatusResetTimeout()
      activeSaveAbortController.current?.abort()

      const abortController = new AbortController()
      activeSaveAbortController.current = abortController

      setStatus("saving")

      void fetch(`/api/projects/${encodeURIComponent(projectId)}/canvas`, {
        body: payload,
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
        signal: abortController.signal,
      })
        .then((response) => {
          if (activeSaveAbortController.current === abortController) {
            activeSaveAbortController.current = null
          }

          if (!response.ok) {
            throw new Error("Canvas autosave failed.")
          }

          lastSavedPayload.current = payload
          setStatus("saved")
          queueStatusReset()
        })
        .catch((error: unknown) => {
          if (activeSaveAbortController.current === abortController) {
            activeSaveAbortController.current = null
          }

          if (isAbortError(error)) {
            return
          }

          setStatus("error")
          queueStatusReset()
        })
    },
    [clearStatusResetTimeout, enabled, projectId, queueStatusReset]
  )

  const saveNow = useCallback(() => {
    clearAutosaveTimeout()
    savePayload(snapshotPayload, { force: true })
  }, [clearAutosaveTimeout, savePayload, snapshotPayload])

  useEffect(() => {
    if (!enabled) {
      activeSaveAbortController.current?.abort()
      activeSaveAbortController.current = null
      clearAutosaveTimeout()
      clearStatusResetTimeout()
      hasInitialized.current = false
      return
    }

    if (!hasInitialized.current) {
      hasInitialized.current = true

      if (skipInitialSave) {
        lastSavedPayload.current = snapshotPayload
        return
      }
    }

    if (snapshotPayload === lastSavedPayload.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (autosaveTimeoutId.current === timeoutId) {
        autosaveTimeoutId.current = null
      }

      savePayload(snapshotPayload)
    }, debounceMs)
    autosaveTimeoutId.current = timeoutId

    return () => {
      if (autosaveTimeoutId.current === timeoutId) {
        window.clearTimeout(timeoutId)
        autosaveTimeoutId.current = null
      }
    }
  }, [
    clearAutosaveTimeout,
    clearStatusResetTimeout,
    debounceMs,
    enabled,
    savePayload,
    skipInitialSave,
    snapshotPayload,
  ])

  useEffect(() => {
    return () => {
      activeSaveAbortController.current?.abort()
      activeSaveAbortController.current = null
      clearAutosaveTimeout()
      clearStatusResetTimeout()
    }
  }, [clearAutosaveTimeout, clearStatusResetTimeout])

  return {
    saveNow,
    status: enabled ? status : "idle",
  }
}

export { useCanvasAutosave }
