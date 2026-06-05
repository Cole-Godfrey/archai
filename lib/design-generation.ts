import { randomUUID } from "node:crypto"

import {
  createGoogleGenerativeAI,
  type GoogleLanguageModelOptions,
} from "@ai-sdk/google"
import type { MutableFlow } from "@liveblocks/react-flow/node"
import { generateObject, NoObjectGeneratedError } from "ai"
import { z } from "zod"

import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColorId,
  type CanvasNodeData,
  type CanvasNodeShape,
  type CanvasSnapshot,
} from "@/types/canvas"

const DEFAULT_MODEL = "gemini-3.5-flash"

// New node placement is model-directed. The prompt gives Gemini the current
// canvas geometry and requester viewport, and the schema requires add_node
// coordinates so missing placement is treated as a generation failure.
const MIN_NODE_DIMENSION = 72
const MAX_NODE_DIMENSION = 480
const MAX_ACTIONS = 60
const DESIGN_GENERATION_TIMEOUT_MS = 90_000
const MIN_EDGE_LABEL_CENTER_DISTANCE = 300
const LONG_EDGE_LABEL_CENTER_DISTANCE = 400
const LONG_EDGE_LABEL_LENGTH = 18
const EDGE_SPACING_PASSES = 3
// Post-generation overlap guard: nudge model-placed nodes apart when their
// boxes overlap, or when a node sits where an edge label would render.
const NODE_SEPARATION_GAP = 32
const EDGE_LABEL_NODE_CLEARANCE = 28
const OVERLAP_RESOLUTION_PASSES = 6
const OVERLAP_EPSILON_PX = 0.5

// Default footprint per shape, mirroring the canvas shape panel so generated
// nodes render at the same proportions as hand-dropped ones.
const DEFAULT_SHAPE_SIZES: Record<
  CanvasNodeShape,
  { width: number; height: number }
> = {
  rectangle: { width: 128, height: 72 },
  diamond: { width: 104, height: 104 },
  circle: { width: 88, height: 88 },
  pill: { width: 128, height: 64 },
  cylinder: { width: 112, height: 88 },
  hexagon: { width: 128, height: 84 },
}

const NODE_COLOR_IDS = NODE_COLORS.map((color) => color.id) as [
  CanvasNodeColorId,
  ...CanvasNodeColorId[],
]

const shapeSchema = z.enum([...NODE_SHAPES] as [
  CanvasNodeShape,
  ...CanvasNodeShape[],
])
const colorSchema = z.enum(NODE_COLOR_IDS)
const edgeSideSchema = z.enum(["top", "right", "bottom", "left"])
type EdgeSide = z.infer<typeof edgeSideSchema>
const actionIdSchema = z
  .string()
  .min(1)
  .describe(
    "For add_node/add_edge: a short unique id you invent and reuse when referencing it. For edits and deletes: the id of the existing node or edge."
  )
const nodeLabelSchema = z
  .string()
  .min(1)
  .describe("Short node label, usually 1-4 words.")
const edgeLabelSchema = z
  .string()
  .min(1)
  .describe(
    "Short descriptive edge label naming the relationship, protocol, data flow, or command."
  )
const coordinateSchema = z
  .number()
  .finite()
  .describe("Canvas flow-coordinate number.")
const dimensionSchema = z.number().finite()

const addNodeActionSchema = z.object({
  type: z.literal("add_node"),
  id: actionIdSchema,
  label: nodeLabelSchema,
  shape: shapeSchema,
  color: colorSchema,
  x: coordinateSchema.describe("Required top-left x coordinate."),
  y: coordinateSchema.describe("Required top-left y coordinate."),
  width: dimensionSchema.optional(),
  height: dimensionSchema.optional(),
})

const updateNodeActionSchema = z.object({
  type: z.literal("update_node"),
  id: actionIdSchema,
  label: nodeLabelSchema.optional(),
  shape: shapeSchema.optional(),
  color: colorSchema.optional(),
})

const moveNodeActionSchema = z.object({
  type: z.literal("move_node"),
  id: actionIdSchema,
  x: coordinateSchema.describe("Required top-left x coordinate."),
  y: coordinateSchema.describe("Required top-left y coordinate."),
})

const resizeNodeActionSchema = z.object({
  type: z.literal("resize_node"),
  id: actionIdSchema,
  width: dimensionSchema,
  height: dimensionSchema,
})

const deleteNodeActionSchema = z.object({
  type: z.literal("delete_node"),
  id: actionIdSchema,
})

const addEdgeActionSchema = z.object({
  type: z.literal("add_edge"),
  id: actionIdSchema,
  label: edgeLabelSchema,
  source: z.string().min(1).describe("Source node id."),
  target: z.string().min(1).describe("Target node id."),
  sourceSide: edgeSideSchema.optional(),
  targetSide: edgeSideSchema.optional(),
})

const deleteEdgeActionSchema = z.object({
  type: z.literal("delete_edge"),
  id: actionIdSchema,
})

// Per-action schemas make required fields visible to the provider's structured
// output schema instead of relying on post-parse refinements.
const designActionSchema = z.discriminatedUnion("type", [
  addNodeActionSchema,
  updateNodeActionSchema,
  moveNodeActionSchema,
  resizeNodeActionSchema,
  deleteNodeActionSchema,
  addEdgeActionSchema,
  deleteEdgeActionSchema,
])

const designPlanSchema = z.object({
  summary: z
    .string()
    .describe("One concise sentence describing the design change."),
  actions: z.array(designActionSchema).max(MAX_ACTIONS),
})

type DesignPlan = z.infer<typeof designPlanSchema>

type PreparedOp =
  | { kind: "update_node"; id: string; data: Partial<CanvasNodeData> }
  | { kind: "move_node"; id: string; position: { x: number; y: number } }
  | { kind: "resize_node"; id: string; width: number; height: number }
  | { kind: "delete_node"; id: string }
  | { kind: "add_edge"; edge: CanvasEdge }
  | { kind: "delete_edge"; id: string }

interface PreparedDesignPlan {
  summary: string
  addNodes: CanvasNode[]
  ops: PreparedOp[]
  centroid: { x: number; y: number } | null
  addedNodeCount: number
  addedEdgeCount: number
  updatedCount: number
  removedCount: number
}

interface DesignGenerationDiagnostics {
  errorName: string
  errorMessage: string
  causeName: string | null
  causeMessage: string | null
  finishReason: string | null
  modelId: string | null
  rawResponse: string | null
  schemaIssues: string[]
  usage: unknown
}

class DesignGenerationTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Design generation timed out after ${timeoutMs / 1000} seconds.`)
    this.name = "DesignGenerationTimeoutError"
  }
}

class DesignGenerationInvalidOutputError extends Error {
  readonly diagnostics: DesignGenerationDiagnostics

  constructor(diagnostics: DesignGenerationDiagnostics, cause: unknown) {
    const issues =
      diagnostics.schemaIssues.length > 0
        ? diagnostics.schemaIssues.join("; ")
        : (diagnostics.causeMessage ?? diagnostics.errorMessage)
    const rawResponse = diagnostics.rawResponse ?? "(no Gemini text returned)"

    super(
      `Gemini response did not match the design schema. Schema issues: ${issues}. Raw Gemini response: ${rawResponse}`,
      { cause }
    )
    this.name = "DesignGenerationInvalidOutputError"
    this.diagnostics = diagnostics
  }
}

const SYSTEM_PROMPT = `You are Archai's system-design agent. You turn a natural-language request into a clean architecture diagram on a shared canvas by emitting a list of canvas actions.

NODE SHAPES (use only these, matched to their meaning):
- rectangle: general-purpose component
- pill: a service or process
- cylinder: a database or storage
- hexagon: an external system or boundary
- diamond: a decision or gateway
- circle: an event or endpoint

COLORS (use only these ids, grouped by concern for readability):
- neutral, blue, violet, amber, red, rose, green, teal
Every node MUST have a color. Group related components with a shared color (e.g. data stores teal, external systems amber, gateways violet). Reserve neutral for genuinely generic components — do not default everything to neutral.

LAYOUT:
- Canvas coordinates are flow coordinates. x/y are the top-left of a node. Positive x moves right; positive y moves down.
- Existing node entries include position, size, and center. Use that geometry when placing or moving nodes.
- Every add_node action MUST include x and y. Choose coordinates that make the requested architecture readable and spatially related to connected or referenced existing nodes.
- When adding to an existing diagram, place new nodes near the existing components they connect to unless the request asks for a separate area. Do not push additions to the far right by default.
- When the canvas is empty, arrange the design around the requester's viewport center when provided.
- Leave generous space between connected node centers so edge labels sit in open space, not on node blocks. Aim for at least 300px center-to-center for normal labels and 400px or more for labels longer than about 18 characters.
- You may set width/height on add_node when size helps clarity; otherwise omit them and defaults will be used.

ACTIONS:
- Return one JSON object with exactly this top-level shape: { "summary": string, "actions": Action[] }. Never return a bare array.
- Every action object MUST use the discriminator key "type". Never use "action" as a key.
- add_node: needs id, label, shape, color, x, y.
- add_edge: needs id, source, target (node ids), and a required descriptive label naming the relationship or data it carries (e.g. "HTTP", "reads", "writes", "publishes events", "authenticates"). Direct edges along the request/data flow. sourceSide/targetSide (top/right/bottom/left) are optional connection points — omit them and Archai routes each edge from the side facing the other node (e.g. bottom-to-top when a node sits directly below). Only set them to override that automatic routing.
- update_node: id of an existing node plus any of label/shape/color to change.
- move_node: id + x + y. resize_node: id + width + height. Move existing nodes when needed to satisfy the request or improve the resulting layout.
- delete_node: id. delete_edge: id.

RULES:
- Keep labels short (1-4 words).
- Shape and color are separate fields. shape must be one of rectangle, pill, cylinder, hexagon, diamond, circle. color must be one of neutral, blue, violet, amber, red, rose, green, teal.
- Every node must have a color, and every edge must have a short, descriptive label. Never use a generic edge label like "connects".
- Do not omit required action fields. If you add a node, include color. If you add an edge, include label.
- Prefer adding nodes and edges. Only edit or delete existing elements when the request clearly asks for it.
- Always connect the components you add so the diagram reads as a coherent system.
- Return a concise summary and the list of actions.`

function getGoogleProviderOptions(modelId: string): {
  google: GoogleLanguageModelOptions
} {
  const googleOptions: GoogleLanguageModelOptions = {
    // The local Zod schema remains strict. Google structured outputs can stall
    // on discriminated unions, so use JSON mode and validate locally.
    structuredOutputs: false,
  }

  if (/^gemini-3[.-]/.test(modelId)) {
    googleOptions.thinkingConfig = { thinkingLevel: "high" }
  }

  return { google: googleOptions }
}

function getDesignModelId(): string {
  const modelId = process.env.GOOGLE_AI_MODEL ?? DEFAULT_MODEL

  if (!/^gemini-3[.-]/.test(modelId)) {
    throw new Error(
      `Unsupported Google AI model "${modelId}". Design generation requires a Gemini 3 model id such as "${DEFAULT_MODEL}".`
    )
  }

  return modelId
}

function requireGoogleApiKey(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error(
      "GOOGLE_AI_API_KEY is required for the design agent to interpret prompts."
    )
  }

  return apiKey
}

function describeCanvas(snapshot: CanvasSnapshot): string {
  if (snapshot.nodes.length === 0 && snapshot.edges.length === 0) {
    return "The canvas is currently empty."
  }

  const nodeLines = snapshot.nodes
    .map(
      (node) => {
        const width = getNodeWidth(node)
        const height = getNodeHeight(node)
        const centerX = node.position.x + width / 2
        const centerY = node.position.y + height / 2

        return `- ${node.id}: "${node.data.label || "Untitled"}" (${node.data.shape}, ${node.data.color}) position=(${formatCanvasNumber(node.position.x)}, ${formatCanvasNumber(node.position.y)}), size=${formatCanvasNumber(width)}x${formatCanvasNumber(height)}, center=(${formatCanvasNumber(centerX)}, ${formatCanvasNumber(centerY)})`
      }
    )
    .join("\n")
  const edgeLines = snapshot.edges
    .map(
      (edge) =>
        `- ${edge.id}: ${edge.source} -> ${edge.target}${
          edge.data?.label ? ` (${edge.data.label})` : ""
        }`
    )
    .join("\n")

  return `Existing nodes:\n${nodeLines || "- none"}\n\nExisting edges:\n${
    edgeLines || "- none"
  }`
}

function describeViewportCenter(
  viewportCenter?: { x: number; y: number }
): string {
  if (viewportCenter === undefined) {
    return "Requester viewport center: unavailable."
  }

  return `Requester viewport center: (${formatCanvasNumber(viewportCenter.x)}, ${formatCanvasNumber(viewportCenter.y)}).`
}

function buildUserPrompt(
  prompt: string,
  snapshot: CanvasSnapshot,
  viewportCenter?: { x: number; y: number }
): string {
  return `${describeCanvas(snapshot)}\n\n${describeViewportCenter(viewportCenter)}\n\nRequest:\n${prompt}\n\nProduce the canvas actions that fulfill the request.`
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error
}

function getErrorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null
}

function formatSchemaIssue(issue: z.ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)"

  return `${path}: ${issue.message}`
}

function parseRawGeminiResponse(rawResponse: string): unknown {
  return JSON.parse(rawResponse)
}

function getDesignGenerationDiagnostics(
  error: unknown
): DesignGenerationDiagnostics | null {
  if (error instanceof DesignGenerationInvalidOutputError) {
    return error.diagnostics
  }

  if (!NoObjectGeneratedError.isInstance(error)) {
    return null
  }

  const rawResponse = error.text ?? null
  const schemaIssues: string[] = []

  if (rawResponse === null) {
    schemaIssues.push("Gemini did not return text to validate.")
  } else {
    try {
      const parsed = parseRawGeminiResponse(rawResponse)
      const validation = designPlanSchema.safeParse(parsed)

      if (!validation.success) {
        schemaIssues.push(...validation.error.issues.map(formatSchemaIssue))
      }
    } catch (parseError) {
      schemaIssues.push(
        `Gemini response was not valid JSON: ${
          getErrorMessage(parseError) ?? String(parseError)
        }`
      )
    }
  }

  return {
    errorName: error.name,
    errorMessage: error.message,
    causeName:
      error.cause === undefined || error.cause === null
        ? null
        : getErrorName(error.cause),
    causeMessage:
      error.cause === undefined || error.cause === null
        ? null
        : getErrorMessage(error.cause),
    finishReason: error.finishReason ?? null,
    modelId: error.response?.modelId ?? null,
    rawResponse,
    schemaIssues,
    usage: error.usage,
  }
}

/** Interprets a prompt with Gemini into a validated, structured design plan. */
async function generateDesignPlan(
  prompt: string,
  snapshot: CanvasSnapshot,
  viewportCenter?: { x: number; y: number }
): Promise<DesignPlan> {
  const google = createGoogleGenerativeAI({ apiKey: requireGoogleApiKey() })
  const modelId = getDesignModelId()
  const model = google(modelId)
  const abortController = new AbortController()
  const timeout = setTimeout(() => {
    abortController.abort(
      new DesignGenerationTimeoutError(DESIGN_GENERATION_TIMEOUT_MS)
    )
  }, DESIGN_GENERATION_TIMEOUT_MS)

  try {
    const { object } = await generateObject({
      model,
      schema: designPlanSchema,
      schemaName: "ArchaiDesignPlan",
      schemaDescription:
        "A strict canvas-editing plan. add_node actions require color and coordinates; add_edge actions require descriptive labels.",
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(prompt, snapshot, viewportCenter),
      temperature: 0.5,
      providerOptions: getGoogleProviderOptions(modelId),
      abortSignal: abortController.signal,
    })

    return object
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new DesignGenerationTimeoutError(DESIGN_GENERATION_TIMEOUT_MS)
    }

    const diagnostics = getDesignGenerationDiagnostics(error)

    if (diagnostics !== null) {
      throw new DesignGenerationInvalidOutputError(diagnostics, error)
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function clampDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_NODE_DIMENSION
  }

  return Math.min(
    MAX_NODE_DIMENSION,
    Math.max(MIN_NODE_DIMENSION, Math.round(value))
  )
}

function getNodeWidth(node: CanvasNode): number {
  return node.width ?? DEFAULT_SHAPE_SIZES[node.data.shape].width
}

function getNodeHeight(node: CanvasNode): number {
  return node.height ?? DEFAULT_SHAPE_SIZES[node.data.shape].height
}

function getNodeCenter(node: CanvasNode): { x: number; y: number } {
  return {
    x: node.position.x + getNodeWidth(node) / 2,
    y: node.position.y + getNodeHeight(node) / 2,
  }
}

function getRequiredEdgeLabelCenterDistance(label: string): number {
  return label.trim().length >= LONG_EDGE_LABEL_LENGTH
    ? LONG_EDGE_LABEL_CENTER_DISTANCE
    : MIN_EDGE_LABEL_CENTER_DISTANCE
}

function cloneNodeForSpacing(node: CanvasNode): CanvasNode {
  return {
    ...node,
    data: { ...node.data },
    position: { ...node.position },
  }
}

function getHandleSide(
  handle: string | null | undefined
): "top" | "right" | "bottom" | "left" | null {
  const side = handle?.split("-")[0]

  if (
    side === "top" ||
    side === "right" ||
    side === "bottom" ||
    side === "left"
  ) {
    return side
  }

  return null
}

function getSideDirection(
  side: "top" | "right" | "bottom" | "left" | null
): { x: number; y: number } {
  if (side === "top") {
    return { x: 0, y: -1 }
  }
  if (side === "right") {
    return { x: 1, y: 0 }
  }
  if (side === "bottom") {
    return { x: 0, y: 1 }
  }
  if (side === "left") {
    return { x: -1, y: 0 }
  }

  return { x: 1, y: 0 }
}

function getFallbackEdgeDirection(
  edge: CanvasEdge,
  movableEndpoint: "source" | "target"
): { x: number; y: number } {
  const handle =
    movableEndpoint === "target" ? edge.sourceHandle : edge.targetHandle

  return getSideDirection(getHandleSide(handle))
}

function setGeneratedNodePosition(
  node: CanvasNode,
  position: { x: number; y: number },
  moveOpsByNodeId: Map<string, Extract<PreparedOp, { kind: "move_node" }>>
): void {
  const nextPosition = {
    x: Math.round(position.x),
    y: Math.round(position.y),
  }

  node.position = nextPosition

  const moveOp = moveOpsByNodeId.get(node.id)

  if (moveOp !== undefined) {
    moveOp.position = nextPosition
  }
}

// Default fallback when an edge's endpoints can't be resolved to geometry
// (e.g. one side was deleted). Matches the canvas left-to-right reading order.
const DEFAULT_EDGE_SIDES: { sourceSide: EdgeSide; targetSide: EdgeSide } = {
  sourceSide: "right",
  targetSide: "left",
}

/**
 * Picks the connection sides that face each other along the dominant axis
 * between two node centers, so an edge to a node placed directly below exits
 * the bottom and enters the top rather than wrapping around the sides.
 */
function deriveEdgeSidesFromGeometry(
  sourceCenter: { x: number; y: number },
  targetCenter: { x: number; y: number }
): { sourceSide: EdgeSide; targetSide: EdgeSide } {
  const deltaX = targetCenter.x - sourceCenter.x
  const deltaY = targetCenter.y - sourceCenter.y

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0
      ? { sourceSide: "right", targetSide: "left" }
      : { sourceSide: "left", targetSide: "right" }
  }

  return deltaY >= 0
    ? { sourceSide: "bottom", targetSide: "top" }
    : { sourceSide: "top", targetSide: "bottom" }
}

/**
 * Resolves every node id to its final geometry: existing nodes are cloned from
 * the snapshot, generated nodes are referenced live (so later position nudges
 * are reflected), and move/resize/delete ops are applied on top. Shared by edge
 * spacing and handle assignment so positions are computed once.
 */
function buildResolvedNodeMap(
  snapshot: CanvasSnapshot,
  addNodes: CanvasNode[],
  ops: PreparedOp[]
): Map<string, CanvasNode> {
  const nodesById = new Map<string, CanvasNode>()

  for (const node of snapshot.nodes) {
    nodesById.set(node.id, cloneNodeForSpacing(node))
  }

  for (const node of addNodes) {
    nodesById.set(node.id, node)
  }

  for (const op of ops) {
    if (op.kind === "move_node") {
      const node = nodesById.get(op.id)

      if (node !== undefined) {
        node.position = { ...op.position }
      }
    } else if (op.kind === "resize_node") {
      const node = nodesById.get(op.id)

      if (node !== undefined) {
        node.width = op.width
        node.height = op.height
      }
    } else if (op.kind === "delete_node") {
      nodesById.delete(op.id)
    }
  }

  return nodesById
}

function expandGeneratedEdgeSpacing(
  addNodes: CanvasNode[],
  ops: PreparedOp[],
  nodesById: Map<string, CanvasNode>
): void {
  if (addNodes.length === 0) {
    return
  }

  const generatedNodesById = new Map(
    addNodes.map((node) => [node.id, node] as const)
  )
  const moveOpsByGeneratedNodeId = new Map<
    string,
    Extract<PreparedOp, { kind: "move_node" }>
  >()

  for (const op of ops) {
    if (op.kind === "move_node" && generatedNodesById.has(op.id)) {
      moveOpsByGeneratedNodeId.set(op.id, op)
    }
  }

  const edgeOps = ops.filter(
    (op): op is Extract<PreparedOp, { kind: "add_edge" }> =>
      op.kind === "add_edge"
  )

  for (let pass = 0; pass < EDGE_SPACING_PASSES; pass += 1) {
    let changed = false

    for (const op of edgeOps) {
      const { edge } = op
      const source = nodesById.get(edge.source)
      const target = nodesById.get(edge.target)

      if (source === undefined || target === undefined) {
        continue
      }

      const targetGenerated = generatedNodesById.get(edge.target)
      const sourceGenerated = generatedNodesById.get(edge.source)
      const movable = targetGenerated ?? sourceGenerated

      if (movable === undefined) {
        continue
      }

      const movableEndpoint =
        movable.id === edge.target ? ("target" as const) : ("source" as const)
      const fixed = movableEndpoint === "target" ? source : target
      const movableCenter = getNodeCenter(movable)
      const fixedCenter = getNodeCenter(fixed)
      const deltaX = movableCenter.x - fixedCenter.x
      const deltaY = movableCenter.y - fixedCenter.y
      const distance = Math.hypot(deltaX, deltaY)
      const minDistance = getRequiredEdgeLabelCenterDistance(
        edge.data?.label ?? ""
      )

      if (distance >= minDistance) {
        continue
      }

      const fallbackDirection = getFallbackEdgeDirection(edge, movableEndpoint)
      const unit =
        distance > 0
          ? { x: deltaX / distance, y: deltaY / distance }
          : fallbackDirection
      const expansion = minDistance - distance

      setGeneratedNodePosition(
        movable,
        {
          x: movable.position.x + unit.x * expansion,
          y: movable.position.y + unit.y * expansion,
        },
        moveOpsByGeneratedNodeId
      )
      changed = true
    }

    if (!changed) {
      break
    }
  }
}

/**
 * Resolves an overlap between two nodes by pushing along the axis of least
 * penetration. Boxes are inflated by half the gap so resolved nodes keep a full
 * gap between them. A movable pair splits the push; otherwise the movable node
 * absorbs all of it. Returns whether anything moved.
 */
function resolveNodeOverlap(
  a: CanvasNode,
  b: CanvasNode,
  aMovable: boolean,
  bMovable: boolean,
  moveOps: Map<string, Extract<PreparedOp, { kind: "move_node" }>>
): boolean {
  const half = NODE_SEPARATION_GAP / 2
  const aLeft = a.position.x - half
  const aRight = a.position.x + getNodeWidth(a) + half
  const aTop = a.position.y - half
  const aBottom = a.position.y + getNodeHeight(a) + half
  const bLeft = b.position.x - half
  const bRight = b.position.x + getNodeWidth(b) + half
  const bTop = b.position.y - half
  const bBottom = b.position.y + getNodeHeight(b) + half

  const overlapX = Math.min(aRight, bRight) - Math.max(aLeft, bLeft)
  const overlapY = Math.min(aBottom, bBottom) - Math.max(aTop, bTop)

  if (overlapX <= OVERLAP_EPSILON_PX || overlapY <= OVERLAP_EPSILON_PX) {
    return false
  }

  const aCenter = getNodeCenter(a)
  const bCenter = getNodeCenter(b)
  let pushX = 0
  let pushY = 0

  if (overlapX < overlapY) {
    pushX = (bCenter.x >= aCenter.x ? 1 : -1) * overlapX
  } else {
    pushY = (bCenter.y >= aCenter.y ? 1 : -1) * overlapY
  }

  if (aMovable && bMovable) {
    setGeneratedNodePosition(
      a,
      { x: a.position.x - pushX / 2, y: a.position.y - pushY / 2 },
      moveOps
    )
    setGeneratedNodePosition(
      b,
      { x: b.position.x + pushX / 2, y: b.position.y + pushY / 2 },
      moveOps
    )
  } else if (bMovable) {
    setGeneratedNodePosition(
      b,
      { x: b.position.x + pushX, y: b.position.y + pushY },
      moveOps
    )
  } else {
    setGeneratedNodePosition(
      a,
      { x: a.position.x - pushX, y: a.position.y - pushY },
      moveOps
    )
  }

  return true
}

/**
 * Pushes a movable node out of a fixed clearance box (an edge label anchor)
 * along the axis of least penetration. Returns whether anything moved.
 */
function pushNodeFromLabelBox(
  node: CanvasNode,
  box: { centerX: number; centerY: number; halfWidth: number; halfHeight: number },
  moveOps: Map<string, Extract<PreparedOp, { kind: "move_node" }>>
): boolean {
  const nodeLeft = node.position.x
  const nodeRight = node.position.x + getNodeWidth(node)
  const nodeTop = node.position.y
  const nodeBottom = node.position.y + getNodeHeight(node)

  const overlapX =
    Math.min(nodeRight, box.centerX + box.halfWidth) -
    Math.max(nodeLeft, box.centerX - box.halfWidth)
  const overlapY =
    Math.min(nodeBottom, box.centerY + box.halfHeight) -
    Math.max(nodeTop, box.centerY - box.halfHeight)

  if (overlapX <= OVERLAP_EPSILON_PX || overlapY <= OVERLAP_EPSILON_PX) {
    return false
  }

  const center = getNodeCenter(node)
  let pushX = 0
  let pushY = 0

  if (overlapX < overlapY) {
    pushX = (center.x >= box.centerX ? 1 : -1) * overlapX
  } else {
    pushY = (center.y >= box.centerY ? 1 : -1) * overlapY
  }

  setGeneratedNodePosition(
    node,
    { x: node.position.x + pushX, y: node.position.y + pushY },
    moveOps
  )

  return true
}

/**
 * Final layout guard: nudges model-placed nodes just enough so their boxes no
 * longer overlap each other, and so no node sits where an edge label renders.
 * Only generated nodes move; existing nodes stay fixed as obstacles. Runs a few
 * passes since moving one node can introduce a new overlap.
 */
function separateGeneratedOverlaps(
  addNodes: CanvasNode[],
  ops: PreparedOp[],
  nodesById: Map<string, CanvasNode>
): void {
  if (addNodes.length === 0) {
    return
  }

  const generatedNodesById = new Map(
    addNodes.map((node) => [node.id, node] as const)
  )
  const moveOpsByGeneratedNodeId = new Map<
    string,
    Extract<PreparedOp, { kind: "move_node" }>
  >()

  for (const op of ops) {
    if (op.kind === "move_node" && generatedNodesById.has(op.id)) {
      moveOpsByGeneratedNodeId.set(op.id, op)
    }
  }

  const allNodes = [...nodesById.values()]
  const edgeOps = ops.filter(
    (op): op is Extract<PreparedOp, { kind: "add_edge" }> =>
      op.kind === "add_edge"
  )

  for (let pass = 0; pass < OVERLAP_RESOLUTION_PASSES; pass += 1) {
    let changed = false

    for (let i = 0; i < allNodes.length; i += 1) {
      for (let j = i + 1; j < allNodes.length; j += 1) {
        const a = allNodes[i]
        const b = allNodes[j]
        const aMovable = generatedNodesById.has(a.id)
        const bMovable = generatedNodesById.has(b.id)

        if (!aMovable && !bMovable) {
          continue
        }

        if (
          resolveNodeOverlap(a, b, aMovable, bMovable, moveOpsByGeneratedNodeId)
        ) {
          changed = true
        }
      }
    }

    for (const op of edgeOps) {
      const source = nodesById.get(op.edge.source)
      const target = nodesById.get(op.edge.target)

      if (source === undefined || target === undefined) {
        continue
      }

      const sourceCenter = getNodeCenter(source)
      const targetCenter = getNodeCenter(target)
      const box = {
        centerX: (sourceCenter.x + targetCenter.x) / 2,
        centerY: (sourceCenter.y + targetCenter.y) / 2,
        halfWidth: EDGE_LABEL_NODE_CLEARANCE,
        halfHeight: EDGE_LABEL_NODE_CLEARANCE,
      }

      for (const node of allNodes) {
        if (
          node.id === op.edge.source ||
          node.id === op.edge.target ||
          !generatedNodesById.has(node.id)
        ) {
          continue
        }

        if (pushNodeFromLabelBox(node, box, moveOpsByGeneratedNodeId)) {
          changed = true
        }
      }
    }

    if (!changed) {
      break
    }
  }
}

/**
 * Fills in any edge handle the model left unset by routing it from the side
 * that faces the other node, using the post-spacing geometry. Sides the model
 * supplied explicitly are kept, so it can override the automatic routing.
 */
function assignGeometricEdgeHandles(
  ops: PreparedOp[],
  nodesById: Map<string, CanvasNode>
): void {
  for (const op of ops) {
    if (op.kind !== "add_edge") {
      continue
    }

    const { edge } = op

    if (edge.sourceHandle != null && edge.targetHandle != null) {
      continue
    }

    const source = nodesById.get(edge.source)
    const target = nodesById.get(edge.target)
    const sides =
      source === undefined || target === undefined
        ? DEFAULT_EDGE_SIDES
        : deriveEdgeSidesFromGeometry(
            getNodeCenter(source),
            getNodeCenter(target)
          )

    if (edge.sourceHandle == null) {
      edge.sourceHandle = `${sides.sourceSide}-source`
    }
    if (edge.targetHandle == null) {
      edge.targetHandle = `${sides.targetSide}-target`
    }
  }
}

function formatCanvasNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function requireNonEmptyText(value: string | undefined, field: string): string {
  const trimmed = value?.trim() ?? ""

  if (trimmed.length === 0) {
    throw new Error(`Design plan is missing required ${field}.`)
  }

  return trimmed
}

function requireShape(
  value: CanvasNodeShape | undefined,
  field: string
): CanvasNodeShape {
  if (value === undefined) {
    throw new Error(`Design plan is missing required ${field}.`)
  }

  return value
}

function requireColor(
  value: CanvasNodeColorId | undefined,
  field: string
): CanvasNodeColorId {
  if (value === undefined) {
    throw new Error(`Design plan is missing required ${field}.`)
  }

  return value
}

function requireFiniteNumber(value: number | undefined, field: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Design plan is missing required ${field}.`)
  }

  return value
}

/**
 * Resolves a model-supplied design plan into concrete canvas operations:
 * trusts model-supplied add_node coordinates, generates collision-free ids,
 * and resolves edge/edit references against both newly added and existing
 * elements. Pure — performs no canvas writes, so placement (and the cursor
 * centroid) can be computed before the storage mutation runs.
 */
function prepareDesignPlan(
  snapshot: CanvasSnapshot,
  plan: DesignPlan
): PreparedDesignPlan {
  const existingNodeIds = new Set(snapshot.nodes.map((node) => node.id))
  const existingEdgeIds = new Set(snapshot.edges.map((edge) => edge.id))

  const addActions = plan.actions.filter((action) => action.type === "add_node")

  const idMap = new Map<string, string>()
  const addNodes: CanvasNode[] = []

  for (const action of addActions) {
    const shape = requireShape(action.shape, "add_node.shape")
    const color = requireColor(action.color, "add_node.color")
    const size = DEFAULT_SHAPE_SIZES[shape]
    const realId = `${shape}-${randomUUID()}`

    idMap.set(action.id, realId)
    addNodes.push({
      id: realId,
      type: CANVAS_NODE_TYPE,
      position: {
        x: requireFiniteNumber(action.x, "add_node.x"),
        y: requireFiniteNumber(action.y, "add_node.y"),
      },
      width:
        action.width === undefined ? size.width : clampDimension(action.width),
      height:
        action.height === undefined
          ? size.height
          : clampDimension(action.height),
      data: {
        label: requireNonEmptyText(action.label, "add_node.label"),
        color,
        shape,
      },
    })
  }

  function resolveNodeId(ref: string | undefined): string | undefined {
    if (ref === undefined) {
      return undefined
    }

    const mapped = idMap.get(ref)

    if (mapped !== undefined) {
      return mapped
    }

    return existingNodeIds.has(ref) ? ref : undefined
  }

  const ops: PreparedOp[] = []
  let updatedCount = 0
  let removedCount = 0
  let addedEdgeCount = 0

  for (const action of plan.actions) {
    if (action.type === "add_node") {
      continue
    }

    if (action.type === "update_node") {
      const id = resolveNodeId(action.id)

      if (id === undefined) {
        continue
      }

      const data: Partial<CanvasNodeData> = {}

      if (action.label !== undefined) {
        data.label = action.label.trim() || "Untitled"
      }
      if (action.shape !== undefined) {
        data.shape = action.shape
      }
      if (action.color !== undefined) {
        data.color = action.color
      }

      if (Object.keys(data).length === 0) {
        continue
      }

      ops.push({ kind: "update_node", id, data })
      updatedCount += 1
    } else if (action.type === "move_node") {
      const id = resolveNodeId(action.id)

      if (
        id === undefined ||
        action.x === undefined ||
        action.y === undefined ||
        !Number.isFinite(action.x) ||
        !Number.isFinite(action.y)
      ) {
        continue
      }

      ops.push({
        kind: "move_node",
        id,
        position: { x: action.x, y: action.y },
      })
      updatedCount += 1
    } else if (action.type === "resize_node") {
      const id = resolveNodeId(action.id)

      if (
        id === undefined ||
        action.width === undefined ||
        action.height === undefined
      ) {
        continue
      }

      ops.push({
        kind: "resize_node",
        id,
        width: clampDimension(action.width),
        height: clampDimension(action.height),
      })
      updatedCount += 1
    } else if (action.type === "delete_node") {
      const id = resolveNodeId(action.id)

      if (id === undefined) {
        continue
      }

      ops.push({ kind: "delete_node", id })
      removedCount += 1
    } else if (action.type === "add_edge") {
      const source = resolveNodeId(action.source)
      const target = resolveNodeId(action.target)

      if (source === undefined || target === undefined || source === target) {
        continue
      }

      // Handles are left unset unless the model explicitly chose a side;
      // assignGeometricEdgeHandles fills the rest from final node geometry.
      ops.push({
        kind: "add_edge",
        edge: {
          id: `edge-${randomUUID()}`,
          source,
          sourceHandle: action.sourceSide
            ? `${action.sourceSide}-source`
            : undefined,
          target,
          targetHandle: action.targetSide
            ? `${action.targetSide}-target`
            : undefined,
          type: CANVAS_EDGE_TYPE,
          data: {
            label: requireNonEmptyText(action.label, "add_edge.label"),
          },
        },
      })
      addedEdgeCount += 1
    } else if (action.type === "delete_edge") {
      if (!existingEdgeIds.has(action.id)) {
        continue
      }

      ops.push({ kind: "delete_edge", id: action.id })
      removedCount += 1
    }
  }

  const resolvedNodes = buildResolvedNodeMap(snapshot, addNodes, ops)
  expandGeneratedEdgeSpacing(addNodes, ops, resolvedNodes)
  separateGeneratedOverlaps(addNodes, ops, resolvedNodes)
  assignGeometricEdgeHandles(ops, resolvedNodes)

  const centroid =
    addNodes.length === 0
      ? null
      : addNodes.reduce(
          (acc, node, index) => {
            acc.x += node.position.x + (node.width ?? 0) / 2
            acc.y += node.position.y + (node.height ?? 0) / 2

            if (index === addNodes.length - 1) {
              acc.x /= addNodes.length
              acc.y /= addNodes.length
            }

            return acc
          },
          { x: 0, y: 0 }
        )

  return {
    summary: plan.summary.trim(),
    addNodes,
    ops,
    centroid,
    addedNodeCount: addNodes.length,
    addedEdgeCount,
    updatedCount,
    removedCount,
  }
}

/**
 * Applies a prepared plan to a live `MutableFlow` inside `mutateFlow`. Adding a
 * node replaces any with the same id; deleting a node also clears its edges so
 * no dangling connections remain.
 */
function applyPreparedPlan(
  flow: MutableFlow<CanvasNode, CanvasEdge>,
  prepared: PreparedDesignPlan
): void {
  if (prepared.addNodes.length > 0) {
    flow.addNodes(prepared.addNodes)
  }

  for (const op of prepared.ops) {
    if (op.kind === "update_node") {
      flow.updateNodeData(op.id, op.data)
    } else if (op.kind === "move_node") {
      flow.updateNode(op.id, { position: op.position })
    } else if (op.kind === "resize_node") {
      flow.updateNode(op.id, { width: op.width, height: op.height })
    } else if (op.kind === "delete_node") {
      for (const edge of flow.edges) {
        if (edge.source === op.id || edge.target === op.id) {
          flow.removeEdge(edge.id)
        }
      }

      flow.removeNode(op.id)
    } else if (op.kind === "add_edge") {
      flow.addEdge(op.edge)
    } else if (op.kind === "delete_edge") {
      flow.removeEdge(op.id)
    }
  }
}

export {
  applyPreparedPlan,
  generateDesignPlan,
  getDesignGenerationDiagnostics,
  prepareDesignPlan,
  type DesignPlan,
  type DesignGenerationDiagnostics,
  type PreparedDesignPlan,
}
