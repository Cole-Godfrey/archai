"use client"

import { useEffect } from "react"
import type { Edge, Node, ReactFlowInstance } from "@xyflow/react"

interface UseKeyboardShortcutsOptions<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
> {
  onRedo: () => void
  onUndo: () => void
  reactFlowInstance: ReactFlowInstance<NodeType, EdgeType> | null
}

const KEYBOARD_VIEWPORT_ANIMATION_DURATION = 180

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.closest("input, textarea, select") !== null
  )
}

function useKeyboardShortcuts<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
>({
  onRedo,
  onUndo,
  reactFlowInstance,
}: UseKeyboardShortcutsOptions<NodeType, EdgeType>) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        isEditableShortcutTarget(event.target)
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const hasCommandModifier = event.metaKey || event.ctrlKey

      if (hasCommandModifier && key === "z" && event.shiftKey) {
        event.preventDefault()
        onRedo()
        return
      }

      if (hasCommandModifier && key === "z") {
        event.preventDefault()
        onUndo()
        return
      }

      if (hasCommandModifier && key === "y") {
        event.preventDefault()
        onRedo()
        return
      }

      if (
        !hasCommandModifier &&
        !event.altKey &&
        (event.key === "+" || event.key === "=")
      ) {
        event.preventDefault()
        void reactFlowInstance?.zoomIn({
          duration: KEYBOARD_VIEWPORT_ANIMATION_DURATION,
        })
        return
      }

      if (!hasCommandModifier && !event.altKey && event.key === "-") {
        event.preventDefault()
        void reactFlowInstance?.zoomOut({
          duration: KEYBOARD_VIEWPORT_ANIMATION_DURATION,
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onRedo, onUndo, reactFlowInstance])
}

export { useKeyboardShortcuts }
