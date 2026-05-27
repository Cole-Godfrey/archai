import type { Edge, Node } from "@xyflow/react"

const CANVAS_NODE_TYPE = "canvasNode"
const CANVAS_EDGE_TYPE = "canvasEdge"

const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const

const NODE_COLORS = [
  { id: "neutral", fill: "#1B1D18", text: "#F2EFE7" },
  { id: "blue", fill: "#112536", text: "#7FB7FF" },
  { id: "violet", fill: "#241D38", text: "#B7A2FF" },
  { id: "amber", fill: "#2D210D", text: "#F0CC7A" },
  { id: "red", fill: "#331A16", text: "#FF817A" },
  { id: "rose", fill: "#321925", text: "#FF8CB5" },
  { id: "green", fill: "#132817", text: "#7BD88F" },
  { id: "teal", fill: "#092824", text: "#86EEE0" },
] as const

type CanvasNodeShape = (typeof NODE_SHAPES)[number]
type CanvasNodeColorId = (typeof NODE_COLORS)[number]["id"]

interface CanvasNodeData extends Record<string, unknown> {
  label: string
  color: CanvasNodeColorId
  shape: CanvasNodeShape
}

interface CanvasEdgeData extends Record<string, unknown> {
  label?: string
}

type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>
type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>
type CanvasSaveStatus = "idle" | "saving" | "saved" | "error"

interface CanvasSnapshot {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasEdgeData,
  type CanvasNode,
  type CanvasNodeColorId,
  type CanvasNodeData,
  type CanvasNodeShape,
  type CanvasSaveStatus,
  type CanvasSnapshot,
}
