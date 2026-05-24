"use client"

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useErrorListener,
} from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type DefaultEdgeOptions,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react"
import {
  Component,
  useCallback,
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColorId,
  type CanvasNodeShape,
} from "@/types/canvas"

interface BaseCanvasProps {
  roomId: string
}

interface CanvasStatusProps {
  title: string
  message: string
}

interface CanvasErrorBoundaryProps {
  children: ReactNode
}

interface CanvasErrorBoundaryState {
  hasError: boolean
}

interface ShapeSize {
  width: number
  height: number
}

interface ShapeDragPayload {
  shape: CanvasNodeShape
  size: ShapeSize
}

interface ShapePanelItem extends ShapeDragPayload {
  label: string
  Icon: LucideIcon
}

const SHAPE_DRAG_MIME_TYPE = "application/x-archai-shape"
const DEFAULT_NODE_COLOR_ID = "neutral" satisfies CanvasNodeColorId
const DEFAULT_NODE_COLOR = NODE_COLORS[0]
const DRAG_IMAGE_SIZE = 36
const FALLBACK_NODE_SIZE: ShapeSize = {
  width: 128,
  height: 72,
}

const SHAPE_PANEL_ITEMS: readonly ShapePanelItem[] = [
  {
    label: "Rectangle",
    shape: "rectangle",
    size: { width: 128, height: 72 },
    Icon: RectangleHorizontal,
  },
  {
    label: "Diamond",
    shape: "diamond",
    size: { width: 104, height: 104 },
    Icon: Diamond,
  },
  {
    label: "Circle",
    shape: "circle",
    size: { width: 88, height: 88 },
    Icon: Circle,
  },
  {
    label: "Pill",
    shape: "pill",
    size: { width: 128, height: 64 },
    Icon: Pill,
  },
  {
    label: "Cylinder",
    shape: "cylinder",
    size: { width: 112, height: 88 },
    Icon: Cylinder,
  },
  {
    label: "Hexagon",
    shape: "hexagon",
    size: { width: 128, height: 84 },
    Icon: Hexagon,
  },
]

const HANDLE_POSITIONS = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const

const nodeHandleClassName =
  "h-2 w-2 border border-canvas bg-copy-primary opacity-0 transition-opacity group-hover:opacity-100"

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "var(--line-strong)",
  },
  style: {
    stroke: "var(--line-strong)",
    strokeWidth: 1.25,
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isCanvasNodeShape(value: unknown): value is CanvasNodeShape {
  return (
    typeof value === "string" &&
    NODE_SHAPES.some((shape) => shape === value)
  )
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function parseShapeDragPayload(payload: string): ShapeDragPayload | null {
  if (payload.length === 0) {
    return null
  }

  let parsedPayload: unknown

  try {
    parsedPayload = JSON.parse(payload)
  } catch {
    return null
  }

  if (
    !isRecord(parsedPayload) ||
    !isCanvasNodeShape(parsedPayload.shape) ||
    !isRecord(parsedPayload.size) ||
    !isPositiveNumber(parsedPayload.size.width) ||
    !isPositiveNumber(parsedPayload.size.height)
  ) {
    return null
  }

  return {
    shape: parsedPayload.shape,
    size: {
      width: parsedPayload.size.width,
      height: parsedPayload.size.height,
    },
  }
}

function hasShapeDragData(types: DataTransfer["types"]) {
  return Array.from(types).includes(SHAPE_DRAG_MIME_TYPE)
}

function getNodeColor(colorId: CanvasNodeColorId) {
  return (
    NODE_COLORS.find((color) => color.id === colorId) ??
    DEFAULT_NODE_COLOR
  )
}

function CanvasStatus({ title, message }: CanvasStatusProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm rounded-lg border border-surface-border bg-surface-glass px-5 py-4 shadow-xl backdrop-blur-md">
        <p className="font-mono text-xs uppercase tracking-normal text-brand">
          {title}
        </p>
        <p className="mt-3 text-sm leading-6 text-copy-muted">{message}</p>
      </div>
    </div>
  )
}

function getMiniMapNodeColor(
  colorById: Map<CanvasNodeColorId, string>,
  color: unknown
) {
  if (typeof color !== "string") {
    return "var(--bg-subtle)"
  }

  return colorById.get(color as CanvasNodeColorId) ?? "var(--bg-subtle)"
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <CanvasStatus
          title="Canvas unavailable"
          message="The collaborative room could not be opened."
        />
      )
    }

    return this.props.children
  }
}

function CanvasNodeHandles({
  isConnectable,
}: {
  isConnectable: boolean
}) {
  return (
    <>
      {HANDLE_POSITIONS.map(({ id, position }) => (
        <Handle
          key={`${id}-target`}
          className={nodeHandleClassName}
          id={`${id}-target`}
          isConnectable={isConnectable}
          position={position}
          type="target"
        />
      ))}
      {HANDLE_POSITIONS.map(({ id, position }) => (
        <Handle
          key={`${id}-source`}
          className={nodeHandleClassName}
          id={`${id}-source`}
          isConnectable={isConnectable}
          position={position}
          type="source"
        />
      ))}
    </>
  )
}

function CanvasNodeRenderer({
  data,
  height,
  isConnectable,
  selected,
  width,
}: NodeProps<CanvasNode>) {
  const nodeColor = getNodeColor(data.color)
  const nodeWidth = width ?? FALLBACK_NODE_SIZE.width
  const nodeHeight = height ?? FALLBACK_NODE_SIZE.height

  return (
    <div
      className={cn(
        "group relative box-border flex items-center justify-center rounded-md border px-3 text-center shadow-xl",
        selected ? "border-brand" : "border-surface-border-subtle"
      )}
      style={{
        backgroundColor: nodeColor.fill,
        color: nodeColor.text,
        height: nodeHeight,
        width: nodeWidth,
      }}
      aria-label={data.label || `${data.shape} node`}
    >
      <span className="max-w-full break-words text-sm font-medium leading-5">
        {data.label}
      </span>
      <CanvasNodeHandles isConnectable={isConnectable} />
    </div>
  )
}

const canvasNodeTypes = {
  [CANVAS_NODE_TYPE]: CanvasNodeRenderer,
} satisfies NodeTypes

function LiveblocksConnectionFallback({
  children,
}: {
  children: ReactNode
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useErrorListener((error) => {
    setErrorMessage(error.message)
  })

  if (errorMessage !== null) {
    return (
      <CanvasStatus
        title="Connection interrupted"
        message={errorMessage}
      />
    )
  }

  return children
}

function ShapePanel() {
  const [draggingShape, setDraggingShape] =
    useState<CanvasNodeShape | null>(null)

  const createDragImage = useCallback(
    (sourceElement: HTMLButtonElement) => {
      const sourceIcon = sourceElement.querySelector("svg")

      if (sourceIcon === null) {
        return
      }

      const dragImage = document.createElement("div")
      const icon = sourceIcon.cloneNode(true)

      dragImage.style.position = "fixed"
      dragImage.style.top = "-1000px"
      dragImage.style.left = "-1000px"
      dragImage.style.display = "flex"
      dragImage.style.alignItems = "center"
      dragImage.style.justifyContent = "center"
      dragImage.style.width = `${DRAG_IMAGE_SIZE}px`
      dragImage.style.height = `${DRAG_IMAGE_SIZE}px`
      dragImage.style.border = "1px solid var(--border-default)"
      dragImage.style.borderRadius = "var(--radius-md)"
      dragImage.style.background = "var(--bg-elevated)"
      dragImage.style.color = "var(--accent-primary)"
      dragImage.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.32)"
      dragImage.append(icon)
      document.body.append(dragImage)

      return dragImage
    },
    []
  )

  const handleShapeDragStart = useCallback(
    (
      event: ReactDragEvent<HTMLButtonElement>,
      { shape, size }: ShapePanelItem
    ) => {
      const payload: ShapeDragPayload = {
        shape,
        size,
      }

      event.dataTransfer.effectAllowed = "copy"
      event.dataTransfer.setData(
        SHAPE_DRAG_MIME_TYPE,
        JSON.stringify(payload)
      )
      setDraggingShape(shape)

      const dragImage = createDragImage(event.currentTarget)

      if (dragImage !== undefined) {
        event.dataTransfer.setDragImage(
          dragImage,
          DRAG_IMAGE_SIZE / 2,
          DRAG_IMAGE_SIZE / 2
        )
        requestAnimationFrame(() => dragImage.remove())
      }
    },
    [createDragImage]
  )

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-4">
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-surface-border bg-surface-glass p-1 shadow-xl backdrop-blur-md"
        aria-label="Shape panel"
        role="toolbar"
      >
        {SHAPE_PANEL_ITEMS.map((item) => {
          const Icon = item.Icon

          return (
            <Button
              key={item.shape}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-md border-transparent bg-transparent text-copy-secondary shadow-none hover:border-surface-border hover:bg-elevated hover:text-brand focus-visible:border-brand focus-visible:ring-brand/30 active:translate-y-0",
                draggingShape === item.shape &&
                  "border-surface-border bg-elevated text-brand"
              )}
              aria-label={`Drag ${item.label}`}
              title={item.label}
              draggable
              onDragEnd={() => setDraggingShape(null)}
              onDragStart={(event) => handleShapeDragStart(event, item)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function SyncedReactFlowCanvas() {
  const { edges, nodes, onConnect, onDelete, onEdgesChange, onNodesChange } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      nodes: { initial: [] },
      edges: { initial: [] },
      suspense: true,
    })
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null)
  const [shouldFitInitialView] = useState(() => nodes.length > 0)

  const nodeColorById = useMemo(
    () => new Map(NODE_COLORS.map((color) => [color.id, color.fill])),
    []
  )

  const handleCanvasDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (!hasShapeDragData(event.dataTransfer.types)) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    },
    []
  )

  const handleCanvasDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (!hasShapeDragData(event.dataTransfer.types)) {
        return
      }

      event.preventDefault()

      const payload = parseShapeDragPayload(
        event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE)
      )

      if (payload === null || reactFlowInstance === null) {
        return
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const centeredPosition = {
        x: position.x - payload.size.width / 2,
        y: position.y - payload.size.height / 2,
      }

      const node: CanvasNode = {
        id: `${payload.shape}-${crypto.randomUUID()}`,
        type: CANVAS_NODE_TYPE,
        position: centeredPosition,
        width: payload.size.width,
        height: payload.size.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR_ID,
          shape: payload.shape,
        },
      }

      onNodesChange([{ type: "add", item: node }])
    },
    [onNodesChange, reactFlowInstance]
  )

  return (
    <ReactFlow<CanvasNode, CanvasEdge>
      className="bg-canvas"
      colorMode="dark"
      connectionMode={ConnectionMode.Loose}
      defaultEdgeOptions={defaultEdgeOptions}
      edges={edges}
      fitView={shouldFitInitialView}
      nodeTypes={canvasNodeTypes}
      nodes={nodes}
      onConnect={onConnect}
      onDelete={onDelete}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      onEdgesChange={onEdgesChange}
      onInit={setReactFlowInstance}
      onNodesChange={onNodesChange}
    >
      <MiniMap
        bgColor="var(--bg-elevated)"
        className="rounded-md border border-surface-border"
        maskColor="var(--surface-glass)"
        maskStrokeColor="var(--border-subtle)"
        nodeColor={(node) =>
          getMiniMapNodeColor(nodeColorById, node.data.color)
        }
        nodeStrokeColor="var(--border-subtle)"
      />
      <Background
        bgColor="var(--bg-canvas)"
        color="var(--grid-line-strong)"
        gap={32}
        size={1.35}
        variant={BackgroundVariant.Dots}
      />
      <ShapePanel />
    </ReactFlow>
  )
}

function BaseCanvas({ roomId }: BaseCanvasProps) {
  return (
    <section className="relative min-w-0 flex-1 overflow-hidden bg-canvas">
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <CanvasErrorBoundary>
          <RoomProvider
            id={roomId}
            initialPresence={{
              cursor: null,
              isThinking: false,
            }}
          >
            <ClientSideSuspense
              fallback={
                <CanvasStatus
                  title="Opening room"
                  message="Loading the collaborative canvas."
                />
              }
            >
              {() => (
                <LiveblocksConnectionFallback>
                  <SyncedReactFlowCanvas />
                </LiveblocksConnectionFallback>
              )}
            </ClientSideSuspense>
          </RoomProvider>
        </CanvasErrorBoundary>
      </LiveblocksProvider>
    </section>
  )
}

export { BaseCanvas }
