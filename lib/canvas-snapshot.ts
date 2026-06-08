import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColorId,
  type CanvasNodeShape,
  type CanvasSnapshot,
} from "@/types/canvas"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0
}

function isOptionalHandle(value: unknown): value is string | null | undefined {
  return (
    value === undefined ||
    value === null ||
    typeof value === "string"
  )
}

function isCanvasNodeShape(value: unknown): value is CanvasNodeShape {
  return (
    typeof value === "string" &&
    NODE_SHAPES.some((shape) => shape === value)
  )
}

function isCanvasNodeColorId(value: unknown): value is CanvasNodeColorId {
  return (
    typeof value === "string" &&
    NODE_COLORS.some((color) => color.id === value)
  )
}

function normalizeCanvasNode(value: unknown): CanvasNode | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.type !== CANVAS_NODE_TYPE ||
    !isRecord(value.position) ||
    !isFiniteNumber(value.position.x) ||
    !isFiniteNumber(value.position.y) ||
    !isRecord(value.data) ||
    typeof value.data.label !== "string" ||
    !isCanvasNodeColorId(value.data.color) ||
    !isCanvasNodeShape(value.data.shape)
  ) {
    return null
  }

  const node: CanvasNode = {
    id: value.id,
    type: CANVAS_NODE_TYPE,
    position: {
      x: value.position.x,
      y: value.position.y,
    },
    data: {
      label: value.data.label,
      color: value.data.color,
      shape: value.data.shape,
    },
  }

  if (isPositiveNumber(value.width)) {
    node.width = value.width
  }

  if (isPositiveNumber(value.height)) {
    node.height = value.height
  }

  return node
}

function normalizeCanvasEdge(value: unknown): CanvasEdge | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.type !== CANVAS_EDGE_TYPE ||
    typeof value.source !== "string" ||
    typeof value.target !== "string" ||
    !isOptionalHandle(value.sourceHandle) ||
    !isOptionalHandle(value.targetHandle)
  ) {
    return null
  }

  const edgeData = isRecord(value.data) ? value.data : {}
  const label = typeof edgeData.label === "string" ? edgeData.label : ""
  const edge: CanvasEdge = {
    id: value.id,
    type: CANVAS_EDGE_TYPE,
    source: value.source,
    target: value.target,
    data: { label },
  }

  if (value.sourceHandle !== undefined) {
    edge.sourceHandle = value.sourceHandle
  }

  if (value.targetHandle !== undefined) {
    edge.targetHandle = value.targetHandle
  }

  if (isPositiveNumber(value.interactionWidth)) {
    edge.interactionWidth = value.interactionWidth
  }

  return edge
}

function parseCanvasSnapshot(value: unknown): CanvasSnapshot | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges)
  ) {
    return null
  }

  const nodes = value.nodes.map(normalizeCanvasNode)
  const edges = value.edges.map(normalizeCanvasEdge)

  if (
    nodes.some((node) => node === null) ||
    edges.some((edge) => edge === null)
  ) {
    return null
  }

  return {
    nodes: nodes as CanvasNode[],
    edges: edges as CanvasEdge[],
  }
}

function createCanvasSnapshot(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): CanvasSnapshot {
  return {
    nodes: nodes.map((node) => {
      const snapshotNode: CanvasNode = {
        id: node.id,
        type: CANVAS_NODE_TYPE,
        position: {
          x: node.position.x,
          y: node.position.y,
        },
        data: {
          label: node.data.label,
          color: node.data.color,
          shape: node.data.shape,
        },
      }

      if (isPositiveNumber(node.width)) {
        snapshotNode.width = node.width
      }

      if (isPositiveNumber(node.height)) {
        snapshotNode.height = node.height
      }

      return snapshotNode
    }),
    edges: edges.map((edge) => {
      const snapshotEdge: CanvasEdge = {
        id: edge.id,
        type: CANVAS_EDGE_TYPE,
        source: edge.source,
        target: edge.target,
        data: {
          label: edge.data?.label ?? "",
        },
      }

      if (edge.sourceHandle !== undefined) {
        snapshotEdge.sourceHandle = edge.sourceHandle
      }

      if (edge.targetHandle !== undefined) {
        snapshotEdge.targetHandle = edge.targetHandle
      }

      if (isPositiveNumber(edge.interactionWidth)) {
        snapshotEdge.interactionWidth = edge.interactionWidth
      }

      return snapshotEdge
    }),
  }
}

export { createCanvasSnapshot, parseCanvasSnapshot }
