"use client"

import { UserButton, useAuth } from "@clerk/nextjs"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  shallow,
  useCanRedo,
  useCanUndo,
  useErrorListener,
  useOthersMapped,
  useRedo,
  useUndo,
  useUpdateMyPresence,
} from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  Redo2,
  RectangleHorizontal,
  Scan,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react"
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  EdgeLabelRenderer,
  Handle,
  NodeResizer,
  Position,
  ReactFlow,
  ViewportPortal,
  useViewport,
  getSmoothStepPath,
  type Connection,
  type DefaultEdgeOptions,
  type EdgeChange,
  type EdgeProps,
  type EdgeTypes,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react"
import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SyntheticEvent as ReactSyntheticEvent,
} from "react"

import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import { useCanvasAutosave } from "@/hooks/use-canvas-autosave"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { parseCanvasSnapshot } from "@/lib/canvas-snapshot"
import { cn } from "@/lib/utils"
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColorId,
  type CanvasSaveStatus,
  type CanvasNodeShape,
} from "@/types/canvas"

interface BaseCanvasProps {
  onManualSaveChange?: (saveCanvas: (() => void) | null) => void
  onSaveStatusChange?: (status: CanvasSaveStatus) => void
  projectId: string
  roomId: string
  templateImportRequest?: CanvasTemplateImportRequest | null
}

interface CanvasTemplateImportRequest {
  requestId: number
  template: CanvasTemplate
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

interface ShapeDragPreviewState extends ShapeDragPayload {
  cursor: {
    x: number
    y: number
  }
}

interface ShapePanelItem extends ShapeDragPayload {
  label: string
  Icon: LucideIcon
}

interface ShapeSurfaceProps {
  fill: string
  height: number
  selected?: boolean
  shape: CanvasNodeShape
  width: number
}

interface CanvasEditingContextValue {
  updateEdgeLabel: (edgeId: string, label: string) => void
  updateNodeColor: (nodeId: string, color: CanvasNodeColorId) => void
  updateNodeLabel: (nodeId: string, label: string) => void
}

interface NodeColorToolbarProps {
  activeColorId: CanvasNodeColorId
  onCanvasInteraction: (event: ReactSyntheticEvent) => void
  onColorSelect: (colorId: CanvasNodeColorId) => void
}

interface CanvasControlBarProps {
  canRedo: boolean
  canUndo: boolean
  onFitView: () => void
  onRedo: () => void
  onUndo: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

interface CanvasControlButtonProps {
  disabled?: boolean
  icon: LucideIcon
  label: string
  onClick: () => void
}

interface CollaboratorAvatar {
  avatar?: string
  color: string
  id: string
  name: string
}

interface CollaboratorAvatarEntry extends CollaboratorAvatar {
  connectionId: number
}

interface CursorParticipant {
  color: string
  cursor: {
    x: number
    y: number
  } | null
  id: string
  name: string
}

interface LiveCursorProps {
  color: string
  name: string
  position: {
    x: number
    y: number
  }
}

interface LiveCursorsProps {
  currentUserId: string | null
}

interface ParticipantAvatarGroupProps {
  currentUserId: string | null
}

interface SyncedReactFlowCanvasProps {
  onManualSaveChange?: (saveCanvas: (() => void) | null) => void
  onSaveStatusChange?: (status: CanvasSaveStatus) => void
  projectId: string
  templateImportRequest?: CanvasTemplateImportRequest | null
}

interface ShapeEdgeInsets {
  bottom: number
  left: number
  right: number
  top: number
}

const SHAPE_DRAG_MIME_TYPE = "application/x-archai-shape"
const DEFAULT_NODE_COLOR_ID = "neutral" satisfies CanvasNodeColorId
const DEFAULT_NODE_COLOR = NODE_COLORS[0]
const FALLBACK_NODE_SIZE: ShapeSize = {
  width: 128,
  height: 72,
}
const MIN_NODE_SIZE: ShapeSize = {
  width: 72,
  height: 48,
}
const NODE_HANDLE_SIZE = 8
const NODE_EDGE_ARROW_GAP = 6
const NODE_LABEL_PLACEHOLDER = "Untitled"
const EDGE_INTERACTION_WIDTH = 24
const EDGE_STROKE_WIDTH = 1.35
const EDGE_LABEL_PLACEHOLDER = "Label"
const EDGE_LABEL_MIN_WIDTH_CHARS = 7
const EDGE_LABEL_MAX_WIDTH_CHARS = 34
const VIEWPORT_ANIMATION_DURATION = 180
const MAX_VISIBLE_COLLABORATORS = 5
const PARTICIPANT_AVATAR_SIZE_CLASS = "h-7 w-7"

const participantUserButtonAppearance = {
  elements: {
    userButtonAvatarBox: PARTICIPANT_AVATAR_SIZE_CLASS,
    userButtonTrigger: PARTICIPANT_AVATAR_SIZE_CLASS,
  },
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
  "z-30 rounded-full border-2 border-canvas bg-copy-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100"
const nodeResizeHandleClassName =
  "!h-2 !w-2 !rounded-sm !border !border-canvas !bg-brand !opacity-80 !shadow-none"
const nodeResizeLineClassName = "!border-brand !opacity-35"

const CanvasEditingContext =
  createContext<CanvasEditingContextValue | null>(null)

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: CANVAS_EDGE_TYPE,
  interactionWidth: EDGE_INTERACTION_WIDTH,
  style: {
    stroke: "var(--text-secondary)",
    strokeWidth: EDGE_STROKE_WIDTH,
  },
}

const connectionLineStyle = {
  stroke: "var(--text-secondary)",
  strokeLinecap: "round",
  strokeWidth: EDGE_STROKE_WIDTH,
} satisfies CSSProperties

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

function getInitials(name: string) {
  const nameParts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)

  if (nameParts.length === 0) {
    return "?"
  }

  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 2).toUpperCase()
  }

  return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
}

function getReadableTextColor(backgroundColor: string) {
  const colorMatch = /^#([0-9a-fA-F]{6})$/.exec(backgroundColor)

  if (colorMatch === null) {
    return "var(--text-primary)"
  }

  const red = Number.parseInt(colorMatch[1].slice(0, 2), 16)
  const green = Number.parseInt(colorMatch[1].slice(2, 4), 16)
  const blue = Number.parseInt(colorMatch[1].slice(4, 6), 16)
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255

  return luminance > 0.58 ? "var(--bg-base)" : "var(--text-primary)"
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

function getNodeHandleSize() {
  return NODE_HANDLE_SIZE
}

function getShapeEdgeInsets(
  shape: CanvasNodeShape,
  width: number,
  height: number
): ShapeEdgeInsets {
  if (shape === "diamond") {
    return {
      bottom: height * 0.03,
      left: width * 0.03,
      right: width * 0.03,
      top: height * 0.03,
    }
  }

  if (shape === "hexagon") {
    return {
      bottom: height * 0.04,
      left: width * 0.03,
      right: width * 0.03,
      top: height * 0.04,
    }
  }

  if (shape === "cylinder") {
    return {
      bottom: height * 0.07,
      left: width * 0.08,
      right: width * 0.08,
      top: height * 0.06,
    }
  }

  return {
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }
}

function getNodeHandleStyle({
  handleSize,
  insets,
  position,
}: {
  handleSize: number
  insets: ShapeEdgeInsets
  position: Position
}) {
  const handleStyle = {
    height: handleSize,
    minHeight: handleSize,
    minWidth: handleSize,
    pointerEvents: "auto" as const,
    width: handleSize,
    zIndex: 30,
  }
  const edgeGap = NODE_EDGE_ARROW_GAP

  if (position === Position.Top) {
    return {
      ...handleStyle,
      top: insets.top - edgeGap,
    }
  }

  if (position === Position.Right) {
    return {
      ...handleStyle,
      right: insets.right - edgeGap,
    }
  }

  if (position === Position.Bottom) {
    return {
      ...handleStyle,
      bottom: insets.bottom - edgeGap,
    }
  }

  return {
    ...handleStyle,
    left: insets.left - edgeGap,
  }
}

function withHexAlpha(hexColor: string, alphaHex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
    return hexColor
  }

  return `${hexColor}${alphaHex}`
}

function getSwatchShadow(
  textColor: string,
  isActive: boolean,
  isHovered: boolean
) {
  const shadows: string[] = []

  if (isActive) {
    shadows.push("0 0 0 1px var(--bg-canvas)", `0 0 0 2px ${textColor}`)
  }

  if (isHovered) {
    shadows.push(`0 0 8px ${withHexAlpha(textColor, "73")}`)
  }

  return shadows.length > 0 ? shadows.join(", ") : undefined
}

function getEdgeMarkerId(edgeId: string) {
  return `canvas-edge-arrow-${edgeId.replace(/[^a-zA-Z0-9_-]/g, "_")}`
}

function getEdgeLabelInputWidth(label: string) {
  return Math.min(
    EDGE_LABEL_MAX_WIDTH_CHARS,
    Math.max(EDGE_LABEL_MIN_WIDTH_CHARS, label.length + 2)
  )
}

function cloneTemplateNode(node: CanvasNode): CanvasNode {
  return {
    ...node,
    data: { ...node.data },
    position: { ...node.position },
    selected: false,
  }
}

function cloneTemplateEdge(edge: CanvasEdge): CanvasEdge {
  return {
    ...edge,
    data: { ...(edge.data ?? {}) },
    interactionWidth: edge.interactionWidth ?? EDGE_INTERACTION_WIDTH,
    selected: false,
    type: CANVAS_EDGE_TYPE,
  }
}

function getCanvasFitNodes(nodes: CanvasNode[]) {
  return nodes.map((node) => ({
    height: node.height ?? FALLBACK_NODE_SIZE.height,
    id: node.id,
    width: node.width ?? FALLBACK_NODE_SIZE.width,
    x: node.position.x,
    y: node.position.y,
  }))
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
  handleSize,
  isConnectable,
  shape,
  height,
  width,
}: {
  handleSize: number
  height: number
  isConnectable: boolean
  shape: CanvasNodeShape
  width: number
}) {
  const insets = getShapeEdgeInsets(shape, width, height)

  return (
    <>
      {HANDLE_POSITIONS.map(({ id, position }) => {
        const handleStyle = getNodeHandleStyle({
          handleSize,
          insets,
          position,
        })

        return (
          <Handle
            key={`${id}-target`}
            className={nodeHandleClassName}
            id={`${id}-target`}
            isConnectable={isConnectable}
            position={position}
            style={handleStyle}
            type="target"
          />
        )
      })}
      {HANDLE_POSITIONS.map(({ id, position }) => {
        const handleStyle = getNodeHandleStyle({
          handleSize,
          insets,
          position,
        })

        return (
          <Handle
            key={`${id}-source`}
            className={nodeHandleClassName}
            id={`${id}-source`}
            isConnectable={isConnectable}
            position={position}
            style={handleStyle}
            type="source"
          />
        )
      })}
    </>
  )
}

function NodeColorToolbar({
  activeColorId,
  onCanvasInteraction,
  onColorSelect,
}: NodeColorToolbarProps) {
  const [hoveredColorId, setHoveredColorId] =
    useState<CanvasNodeColorId | null>(null)

  const handleColorSelect = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      colorId: CanvasNodeColorId
    ) => {
      event.preventDefault()
      event.stopPropagation()
      onColorSelect(colorId)
    },
    [onColorSelect]
  )

  return (
    <div
      className="nodrag nopan nowheel absolute bottom-full left-1/2 z-40 mb-2 flex -translate-x-1/2 items-center gap-1 rounded-md border border-surface-border bg-surface-glass p-1 shadow-xl backdrop-blur-md"
      aria-label="Node color themes"
      role="toolbar"
      onClick={onCanvasInteraction}
      onDoubleClick={onCanvasInteraction}
      onMouseDown={onCanvasInteraction}
      onPointerDown={onCanvasInteraction}
      onWheel={onCanvasInteraction}
    >
      {NODE_COLORS.map((color) => {
        const isActive = activeColorId === color.id
        const isHovered = hoveredColorId === color.id

        return (
          <button
            key={color.id}
            type="button"
            className="nodrag nopan nowheel flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-[border-color,box-shadow,transform] duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 active:scale-100"
            style={{
              backgroundColor: color.fill,
              borderColor: isActive ? color.text : "var(--border-subtle)",
              boxShadow: getSwatchShadow(color.text, isActive, isHovered),
            }}
            aria-label={`Use ${color.id} node colors`}
            aria-pressed={isActive}
            title={color.id}
            onClick={(event) => handleColorSelect(event, color.id)}
            onDoubleClick={onCanvasInteraction}
            onMouseDown={onCanvasInteraction}
            onMouseEnter={() => setHoveredColorId(color.id)}
            onMouseLeave={() => setHoveredColorId(null)}
            onPointerDown={onCanvasInteraction}
            onWheel={onCanvasInteraction}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-opacity",
                isActive ? "opacity-100" : "opacity-0"
              )}
              style={{ backgroundColor: color.text }}
              aria-hidden="true"
            />
          </button>
        )
      })}
    </div>
  )
}

function ShapeSurface({
  fill,
  height,
  selected = false,
  shape,
  width,
}: ShapeSurfaceProps) {
  const borderColor = selected
    ? "var(--accent-primary)"
    : "var(--border-subtle)"
  const sharedStyle = {
    backgroundColor: fill,
    borderColor,
    height,
    width,
  }

  if (shape === "rectangle" || shape === "pill" || shape === "circle") {
    return (
      <div
        className={cn(
          "absolute inset-0 border shadow-xl",
          selected ? "border-brand" : "border-surface-border-subtle",
          shape === "rectangle" && "rounded-md",
          (shape === "pill" || shape === "circle") && "rounded-full"
        )}
        style={sharedStyle}
        aria-hidden="true"
      />
    )
  }

  if (shape === "diamond") {
    return (
      <svg
        className="absolute inset-0 overflow-visible drop-shadow-xl"
        width={width}
        height={height}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon
          points="50,3 97,50 50,97 3,50"
          fill={fill}
          stroke={borderColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }

  if (shape === "hexagon") {
    return (
      <svg
        className="absolute inset-0 overflow-visible drop-shadow-xl"
        width={width}
        height={height}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon
          points="25,4 75,4 97,50 75,96 25,96 3,50"
          fill={fill}
          stroke={borderColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }

  return (
    <svg
      className="absolute inset-0 overflow-visible drop-shadow-xl"
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M8 18 V82 C8 93 92 93 92 82 V18 Z"
        fill={fill}
        stroke="none"
      />
      <path
        d="M8 18 V82 C8 93 92 93 92 82 V18"
        fill="none"
        stroke={borderColor}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <ellipse
        cx="50"
        cy="18"
        rx="42"
        ry="12"
        fill={fill}
        stroke={borderColor}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function CanvasNodeRenderer({
  data,
  height,
  id,
  isConnectable,
  selected,
  width,
}: NodeProps<CanvasNode>) {
  const nodeColor = getNodeColor(data.color)
  const nodeWidth = width ?? FALLBACK_NODE_SIZE.width
  const nodeHeight = height ?? FALLBACK_NODE_SIZE.height
  const nodeHandleSize = getNodeHandleSize()
  const canvasEditingContext = useContext(CanvasEditingContext)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const hasLabel = data.label.trim().length > 0

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current

    if (textarea === null) {
      return
    }

    const maxHeight = Math.max(24, nodeHeight - 24)

    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [nodeHeight])

  useEffect(() => {
    if (!isEditing) {
      return
    }

    const textarea = textareaRef.current

    if (textarea === null) {
      return
    }

    textarea.focus()
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    syncTextareaHeight()
  }, [isEditing, syncTextareaHeight])

  useEffect(() => {
    if (isEditing) {
      syncTextareaHeight()
    }
  }, [data.label, isEditing, syncTextareaHeight])

  const stopCanvasInteraction = useCallback(
    (event: ReactSyntheticEvent) => {
      event.stopPropagation()
    },
    []
  )

  const handleLabelDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsEditing(true)
    },
    []
  )

  const handleLabelChange = useCallback(
    (event: ReactChangeEvent<HTMLTextAreaElement>) => {
      canvasEditingContext?.updateNodeLabel(id, event.target.value)
      syncTextareaHeight()
    },
    [id, canvasEditingContext, syncTextareaHeight]
  )

  const handleLabelKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      event.stopPropagation()

      if (event.key === "Escape") {
        event.preventDefault()
        setIsEditing(false)
        return
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        setIsEditing(false)
      }
    },
    []
  )

  const handleColorSelect = useCallback(
    (colorId: CanvasNodeColorId) => {
      canvasEditingContext?.updateNodeColor(id, colorId)
    },
    [id, canvasEditingContext]
  )

  return (
    <div
      className={cn(
        "group relative box-border flex items-center justify-center text-center",
        selected && "z-10"
      )}
      style={{
        color: nodeColor.text,
        height: nodeHeight,
        width: nodeWidth,
      }}
      aria-label={data.label || `${data.shape} node`}
    >
      {selected && (
        <NodeColorToolbar
          activeColorId={data.color}
          onCanvasInteraction={stopCanvasInteraction}
          onColorSelect={handleColorSelect}
        />
      )}
      <NodeResizer
        color="var(--accent-primary)"
        handleClassName={nodeResizeHandleClassName}
        isVisible={selected}
        lineClassName={nodeResizeLineClassName}
        minHeight={MIN_NODE_SIZE.height}
        minWidth={MIN_NODE_SIZE.width}
        nodeId={id}
      />
      <ShapeSurface
        fill={nodeColor.fill}
        height={nodeHeight}
        selected={selected}
        shape={data.shape}
        width={nodeWidth}
      />
      <div
        className="relative z-10 flex h-full w-full items-center justify-center px-4 py-3 text-sm font-medium leading-5"
        onDoubleClick={handleLabelDoubleClick}
      >
        <span
          className={cn(
            "max-h-full max-w-full overflow-hidden whitespace-pre-wrap break-words",
            !hasLabel && "opacity-45"
          )}
        >
          {hasLabel ? data.label : NODE_LABEL_PLACEHOLDER}
        </span>
        {isEditing && (
          <textarea
            ref={textareaRef}
            className="nodrag nopan nowheel absolute left-1/2 top-1/2 z-20 max-h-[calc(100%-1.5rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 resize-none overflow-hidden rounded-md border border-brand/60 bg-surface-glass px-2 py-1 text-center text-sm font-medium leading-5 text-inherit caret-brand shadow-lg outline-none placeholder:text-inherit placeholder:opacity-45 focus:border-brand focus:ring-2 focus:ring-brand/20"
            aria-label="Node label"
            placeholder={NODE_LABEL_PLACEHOLDER}
            rows={1}
            value={data.label}
            onBlur={() => setIsEditing(false)}
            onChange={handleLabelChange}
            onClick={stopCanvasInteraction}
            onDoubleClick={stopCanvasInteraction}
            onKeyDown={handleLabelKeyDown}
            onMouseDown={stopCanvasInteraction}
            onPointerDown={stopCanvasInteraction}
            onWheel={stopCanvasInteraction}
          />
        )}
      </div>
      <CanvasNodeHandles
        handleSize={nodeHandleSize}
        height={nodeHeight}
        isConnectable={isConnectable}
        shape={data.shape}
        width={nodeWidth}
      />
    </div>
  )
}

function CanvasEdgeRenderer({
  data,
  id,
  selected,
  sourcePosition = Position.Bottom,
  sourceX,
  sourceY,
  targetPosition = Position.Top,
  targetX,
  targetY,
}: EdgeProps<CanvasEdge>) {
  const canvasEditingContext = useContext(CanvasEditingContext)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(data?.label ?? "")
  const savedLabel = (data?.label ?? "").trim()
  const hasSavedLabel = savedLabel.length > 0
  const isActive = selected === true || isHovered || isEditing
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    borderRadius: 0,
    offset: 28,
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  })
  const markerId = getEdgeMarkerId(id)
  const strokeColor = isActive
    ? "var(--text-primary)"
    : "var(--text-secondary)"
  const strokeOpacity = isActive ? 0.92 : 0.48
  const labelText = hasSavedLabel ? savedLabel : EDGE_LABEL_PLACEHOLDER
  const labelInputWidth = getEdgeLabelInputWidth(draftLabel)

  useEffect(() => {
    if (!isEditing) {
      return
    }

    inputRef.current?.focus()
    inputRef.current?.select()
  }, [isEditing])

  const stopCanvasInteraction = useCallback((event: ReactSyntheticEvent) => {
    event.stopPropagation()
  }, [])

  const beginEditing = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setDraftLabel(data?.label ?? "")
      setIsEditing(true)
    },
    [data?.label]
  )

  const commitLabel = useCallback(() => {
    const nextLabel = draftLabel.trim()

    canvasEditingContext?.updateEdgeLabel(id, nextLabel)
    setDraftLabel(nextLabel)
    setIsEditing(false)
  }, [canvasEditingContext, draftLabel, id])

  const handleInputChange = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      setDraftLabel(event.target.value)
    },
    []
  )

  const handleInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation()

      if (event.key !== "Enter" && event.key !== "Escape") {
        return
      }

      event.preventDefault()
      commitLabel()
    },
    [commitLabel]
  )

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerHeight="8"
          markerWidth="8"
          orient="auto"
          refX="7"
          refY="4"
          viewBox="0 0 8 8"
        >
          <path
            d="M1 1 L7 4 L1 7 Z"
            fill={strokeColor}
            fillOpacity={strokeOpacity}
          />
        </marker>
      </defs>
      <path
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        markerEnd={`url(#${markerId})`}
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={strokeOpacity}
        strokeWidth={EDGE_STROKE_WIDTH}
      />
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        fill="none"
        pointerEvents="stroke"
        stroke="transparent"
        strokeLinecap="round"
        strokeWidth={EDGE_INTERACTION_WIDTH}
        onDoubleClick={beginEditing}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <EdgeLabelRenderer>
        {(hasSavedLabel || isActive) && (
          <div
            className={cn(
              "nodrag nopan nowheel rounded-full border px-2 py-1 font-mono text-[11px] leading-none tracking-normal shadow-lg backdrop-blur-md",
              isActive
                ? "border-surface-border-subtle bg-surface-glass text-copy-primary"
                : "border-surface-border bg-surface-glass text-copy-secondary",
              !hasSavedLabel && !isEditing && "text-copy-muted opacity-55"
            )}
            style={{
              pointerEvents: "all",
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              zIndex: isActive ? 2 : 1,
            }}
            onClick={stopCanvasInteraction}
            onDoubleClick={beginEditing}
            onMouseDown={stopCanvasInteraction}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onPointerDown={stopCanvasInteraction}
            onWheel={stopCanvasInteraction}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                className="nodrag nopan nowheel h-5 rounded-full border border-brand/60 bg-surface-glass px-1.5 font-mono text-[11px] leading-none text-copy-primary caret-brand outline-none placeholder:text-copy-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
                aria-label="Edge label"
                placeholder={EDGE_LABEL_PLACEHOLDER}
                style={{ width: `${labelInputWidth}ch` }}
                value={draftLabel}
                onBlur={() => commitLabel()}
                onChange={handleInputChange}
                onClick={stopCanvasInteraction}
                onDoubleClick={stopCanvasInteraction}
                onKeyDown={handleInputKeyDown}
                onMouseDown={stopCanvasInteraction}
                onPointerDown={stopCanvasInteraction}
                onWheel={stopCanvasInteraction}
              />
            ) : (
              <span className="block max-w-[260px] truncate whitespace-nowrap">
                {labelText}
              </span>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}

const canvasNodeTypes = {
  [CANVAS_NODE_TYPE]: CanvasNodeRenderer,
} satisfies NodeTypes

const canvasEdgeTypes = {
  [CANVAS_EDGE_TYPE]: CanvasEdgeRenderer,
} satisfies EdgeTypes

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
  const [dragPreview, setDragPreview] =
    useState<ShapeDragPreviewState | null>(null)
  const hasDragPreview = dragPreview !== null

  const clearDragPreview = useCallback(() => {
    setDraggingShape(null)
    setDragPreview(null)
  }, [])

  const createTransparentDragImage = useCallback(() => {
    const dragImage = document.createElement("div")

    dragImage.style.position = "fixed"
    dragImage.style.top = "-1000px"
    dragImage.style.left = "-1000px"
    dragImage.style.width = "1px"
    dragImage.style.height = "1px"
    dragImage.style.opacity = "0"
    dragImage.style.pointerEvents = "none"
    document.body.append(dragImage)

    return dragImage
  }, [])

  useEffect(() => {
    if (!hasDragPreview) {
      return
    }

    const updateCursor = (event: DragEvent) => {
      setDragPreview((currentPreview) => {
        if (currentPreview === null) {
          return null
        }

        return {
          ...currentPreview,
          cursor: {
            x: event.clientX,
            y: event.clientY,
          },
        }
      })
    }
    const clearPreview = () => {
      clearDragPreview()
    }

    window.addEventListener("dragover", updateCursor)
    window.addEventListener("dragend", clearPreview)
    window.addEventListener("drop", clearPreview)

    return () => {
      window.removeEventListener("dragover", updateCursor)
      window.removeEventListener("dragend", clearPreview)
      window.removeEventListener("drop", clearPreview)
    }
  }, [clearDragPreview, hasDragPreview])

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

      const sourceBounds = event.currentTarget.getBoundingClientRect()
      const cursor = {
        x: event.clientX || sourceBounds.left + sourceBounds.width / 2,
        y: event.clientY || sourceBounds.top + sourceBounds.height / 2,
      }

      setDragPreview({
        shape,
        size,
        cursor,
      })

      const dragImage = createTransparentDragImage()

      if (dragImage !== undefined) {
        event.dataTransfer.setDragImage(dragImage, 0, 0)
        requestAnimationFrame(() => dragImage.remove())
      }
    },
    [createTransparentDragImage]
  )

  return (
    <>
      {dragPreview !== null && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-50 opacity-75"
          style={{
            height: dragPreview.size.height,
            transform: `translate(${
              dragPreview.cursor.x - dragPreview.size.width / 2
            }px, ${dragPreview.cursor.y - dragPreview.size.height / 2}px)`,
            width: dragPreview.size.width,
          }}
          aria-hidden="true"
        >
          <ShapeSurface
            fill={DEFAULT_NODE_COLOR.fill}
            height={dragPreview.size.height}
            selected
            shape={dragPreview.shape}
            width={dragPreview.size.width}
          />
        </div>
      )}
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
                onDragEnd={clearDragPreview}
                onDragStart={(event) => handleShapeDragStart(event, item)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </Button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function CanvasControlButton({
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: CanvasControlButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-md bg-transparent text-copy-secondary shadow-none hover:bg-elevated hover:text-brand focus-visible:border-brand focus-visible:ring-brand/30 disabled:text-copy-faint disabled:opacity-40 active:translate-y-0"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  )
}

function CanvasControlBar({
  canRedo,
  canUndo,
  onFitView,
  onRedo,
  onUndo,
  onZoomIn,
  onZoomOut,
}: CanvasControlBarProps) {
  return (
    <div className="pointer-events-none absolute bottom-5 left-5 z-30">
      <div
        className="nodrag nopan nowheel pointer-events-auto flex items-center gap-1 rounded-full border border-surface-border bg-surface-glass p-1 shadow-xl backdrop-blur-md"
        aria-label="Canvas controls"
        role="toolbar"
      >
        <div
          className="flex items-center gap-1"
          aria-label="Zoom controls"
          role="group"
        >
          <CanvasControlButton
            icon={ZoomOut}
            label="Zoom out"
            onClick={onZoomOut}
          />
          <CanvasControlButton
            icon={Scan}
            label="Fit view"
            onClick={onFitView}
          />
          <CanvasControlButton
            icon={ZoomIn}
            label="Zoom in"
            onClick={onZoomIn}
          />
        </div>
        <div className="h-6 w-px bg-surface-border" aria-hidden="true" />
        <div
          className="flex items-center gap-1"
          aria-label="History controls"
          role="group"
        >
          <CanvasControlButton
            disabled={!canUndo}
            icon={Undo2}
            label="Undo"
            onClick={onUndo}
          />
          <CanvasControlButton
            disabled={!canRedo}
            icon={Redo2}
            label="Redo"
            onClick={onRedo}
          />
        </div>
      </div>
    </div>
  )
}

function CollaboratorAvatarView({
  collaborator,
  index,
}: {
  collaborator: CollaboratorAvatarEntry
  index: number
}) {
  const hasAvatar =
    collaborator.avatar !== undefined && collaborator.avatar.length > 0
  const initials = getInitials(collaborator.name)
  const textColor = getReadableTextColor(collaborator.color)

  return (
    <div
      className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-canvas bg-elevated text-[10px] font-semibold leading-none tracking-normal ring-1 ring-canvas"
      style={{
        backgroundColor: hasAvatar
          ? "var(--bg-elevated)"
          : collaborator.color,
        backgroundImage: hasAvatar
          ? `url(${collaborator.avatar})`
          : undefined,
        backgroundPosition: "center",
        backgroundSize: "cover",
        color: textColor,
        zIndex: MAX_VISIBLE_COLLABORATORS - index,
      }}
      aria-hidden="true"
    >
      {hasAvatar ? null : initials}
    </div>
  )
}

function ParticipantAvatarGroup({
  currentUserId,
}: ParticipantAvatarGroupProps) {
  const collaboratorEntries = useOthersMapped(
    (other): CollaboratorAvatar => ({
      avatar: other.info.avatar,
      color: other.info.color,
      id: other.id,
      name: other.info.name,
    }),
    shallow
  )
  const collaborators = useMemo(
    () =>
      collaboratorEntries
        .map(
          ([connectionId, collaborator]): CollaboratorAvatarEntry => ({
            ...collaborator,
            connectionId,
          })
        )
        .filter(
          (collaborator) =>
            currentUserId === null || collaborator.id !== currentUserId
        ),
    [collaboratorEntries, currentUserId]
  )
  const visibleCollaborators = collaborators.slice(
    0,
    MAX_VISIBLE_COLLABORATORS
  )
  const overflowCount = Math.max(
    0,
    collaborators.length - visibleCollaborators.length
  )
  const hasCollaborators = collaborators.length > 0

  return (
    <div className="pointer-events-none absolute right-5 top-5 z-50 flex justify-end">
      <div
        className="flex items-center rounded-full border border-surface-border bg-surface-glass px-1.5 py-1 shadow-xl backdrop-blur-md"
        aria-label="Room participants"
      >
        {hasCollaborators ? (
          <>
            <div className="flex -space-x-2" aria-hidden="true">
              {visibleCollaborators.map((collaborator, index) => (
                <CollaboratorAvatarView
                  key={collaborator.connectionId}
                  collaborator={collaborator}
                  index={index}
                />
              ))}
              {overflowCount > 0 ? (
                <div className="relative flex h-7 min-w-7 items-center justify-center rounded-full border border-canvas bg-elevated px-2 font-mono text-[10px] font-medium leading-none text-copy-secondary ring-1 ring-canvas">
                  +{overflowCount}
                </div>
              ) : null}
            </div>
            <div
              className="mx-2 h-5 w-px bg-surface-border"
              aria-hidden="true"
            />
          </>
        ) : null}
        <div className="nodrag nopan nowheel pointer-events-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-canvas">
          <UserButton appearance={participantUserButtonAppearance} />
        </div>
      </div>
    </div>
  )
}

function LiveCursor({ color, name, position }: LiveCursorProps) {
  return (
    <div
      className="absolute left-0 top-0 flex items-start gap-1"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <svg
        className="h-4 w-4 shrink-0 drop-shadow-md"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M1 1 L14 7 L8 9 L5 15 Z"
          fill={color}
          stroke="var(--bg-canvas)"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </svg>
      <span
        className="mt-3 max-w-40 truncate rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none shadow-lg"
        style={{
          backgroundColor: color,
          borderColor: color,
          color: getReadableTextColor(color),
        }}
      >
        {name}
      </span>
    </div>
  )
}

function LiveCursors({
  currentUserId,
}: LiveCursorsProps) {
  const viewport = useViewport()
  const cursorEntries = useOthersMapped(
    (other): CursorParticipant => ({
      color: other.info.color,
      cursor: other.presence.cursor,
      id: other.id,
      name: other.info.name,
    }),
    shallow
  )

  return (
    <ViewportPortal>
      {cursorEntries.map(([connectionId, participant]) => {
        if (
          participant.cursor === null ||
          (currentUserId !== null && participant.id === currentUserId)
        ) {
          return null
        }

        return (
          <div
            key={connectionId}
            className="pointer-events-none absolute left-0 top-0 z-50"
            style={{
              transform: `translate(${participant.cursor.x}px, ${participant.cursor.y}px) scale(${1 / viewport.zoom})`,
              transformOrigin: "top left",
            }}
          >
            <LiveCursor
              color={participant.color}
              name={participant.name}
              position={{ x: 0, y: 0 }}
            />
          </div>
        )
      })}
    </ViewportPortal>
  )
}

function SyncedReactFlowCanvas({
  onManualSaveChange,
  onSaveStatusChange,
  projectId,
  templateImportRequest = null,
}: SyncedReactFlowCanvasProps) {
  const { userId } = useAuth()
  const { edges, nodes, onDelete, onEdgesChange, onNodesChange } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      nodes: { initial: [] },
      edges: { initial: [] },
      suspense: true,
    })
  const updateMyPresence = useUpdateMyPresence()
  const currentUserId = userId ?? null
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null)
  const [shouldFitInitialView] = useState(() => nodes.length > 0)
  const [isCanvasPersistenceReady, setIsCanvasPersistenceReady] =
    useState(false)
  const [canvasLoadStatus, setCanvasLoadStatus] =
    useState<CanvasSaveStatus>("idle")
  const [pendingCanvasFit, setPendingCanvasFit] = useState<{
    nodes: {
      height: number
      id: string
      width: number
      x: number
      y: number
    }[]
    requestId: number
  } | null>(null)
  const hasResolvedInitialCanvasLoad = useRef(false)
  const lastTemplateImportRequestId = useRef<number | null>(null)
  const latestCanvasContent = useRef({ edges, nodes })
  const hasCanvasContent = nodes.length > 0 || edges.length > 0
  const isAutosaveEnabled =
    isCanvasPersistenceReady || hasCanvasContent
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const canvasEdges = useMemo<CanvasEdge[]>(
    () =>
      edges.map((edge): CanvasEdge => {
        const edgeData: NonNullable<CanvasEdge["data"]> =
          edge.data ?? {}

        return {
          ...edge,
          data: edgeData,
          interactionWidth:
            edge.interactionWidth ?? EDGE_INTERACTION_WIDTH,
          type: CANVAS_EDGE_TYPE,
        }
      }),
    [edges]
  )
  const updateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      const edge = edges.find((currentEdge) => currentEdge.id === edgeId)

      if (edge === undefined || (edge.data?.label ?? "") === label) {
        return
      }

      const edgeData = edge.data ?? {}

      onEdgesChange([
        {
          id: edgeId,
          item: {
            ...edge,
            data: {
              ...edgeData,
              label,
            },
            interactionWidth:
              edge.interactionWidth ?? EDGE_INTERACTION_WIDTH,
            type: CANVAS_EDGE_TYPE,
          },
          type: "replace",
        },
      ])
    },
    [edges, onEdgesChange]
  )
  const updateNodeColor = useCallback(
    (nodeId: string, color: CanvasNodeColorId) => {
      const node = nodes.find((currentNode) => currentNode.id === nodeId)

      if (node === undefined || node.data.color === color) {
        return
      }

      onNodesChange([
        {
          id: nodeId,
          item: {
            ...node,
            data: {
              ...node.data,
              color,
            },
          },
          type: "replace",
        },
      ])
    },
    [nodes, onNodesChange]
  )
  const updateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      const node = nodes.find((currentNode) => currentNode.id === nodeId)

      if (node === undefined || node.data.label === label) {
        return
      }

      onNodesChange([
        {
          id: nodeId,
          item: {
            ...node,
            data: {
              ...node.data,
              label,
            },
          },
          type: "replace",
        },
      ])
    },
    [nodes, onNodesChange]
  )
  const canvasEditingContext = useMemo(
    () => ({ updateEdgeLabel, updateNodeColor, updateNodeLabel }),
    [updateEdgeLabel, updateNodeColor, updateNodeLabel]
  )
  const { saveNow, status: autosaveStatus } = useCanvasAutosave({
    edges: canvasEdges,
    enabled: isAutosaveEnabled,
    nodes,
    projectId,
    skipInitialSave: isCanvasPersistenceReady,
  })

  useEffect(() => {
    onManualSaveChange?.(isAutosaveEnabled ? saveNow : null)
  }, [isAutosaveEnabled, onManualSaveChange, saveNow])

  useEffect(() => {
    return () => onManualSaveChange?.(null)
  }, [onManualSaveChange])

  useEffect(() => {
    latestCanvasContent.current = { edges, nodes }
  }, [edges, nodes])

  useEffect(() => {
    onSaveStatusChange?.(
      canvasLoadStatus === "error" ? canvasLoadStatus : autosaveStatus
    )
  }, [autosaveStatus, canvasLoadStatus, onSaveStatusChange])

  useEffect(() => {
    if (hasResolvedInitialCanvasLoad.current) {
      return
    }

    if (hasCanvasContent) {
      hasResolvedInitialCanvasLoad.current = true
      return
    }

    const abortController = new AbortController()

    async function loadSavedCanvas() {
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/canvas`,
          { signal: abortController.signal }
        )

        if (!response.ok) {
          throw new Error("Saved canvas could not be loaded.")
        }

        const payload: unknown = await response.json()

        if (!isRecord(payload)) {
          throw new Error("Saved canvas response is invalid.")
        }

        if (payload.canvas === null) {
          hasResolvedInitialCanvasLoad.current = true
          setIsCanvasPersistenceReady(true)
          return
        }

        const snapshot = parseCanvasSnapshot(payload.canvas)

        if (snapshot === null) {
          throw new Error("Saved canvas schema is invalid.")
        }

        if (
          latestCanvasContent.current.nodes.length > 0 ||
          latestCanvasContent.current.edges.length > 0
        ) {
          hasResolvedInitialCanvasLoad.current = true
          setIsCanvasPersistenceReady(true)
          return
        }

        if (snapshot.nodes.length > 0) {
          onNodesChange(
            snapshot.nodes.map((node, index) => ({
              index,
              item: node,
              type: "add",
            }))
          )
          setPendingCanvasFit({
            nodes: getCanvasFitNodes(snapshot.nodes),
            requestId: Date.now(),
          })
        }

        if (snapshot.edges.length > 0) {
          onEdgesChange(
            snapshot.edges.map((edge, index) => ({
              index,
              item: edge,
              type: "add",
            }))
          )
        }

        hasResolvedInitialCanvasLoad.current = true
        setIsCanvasPersistenceReady(true)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        hasResolvedInitialCanvasLoad.current = true
        setCanvasLoadStatus("error")
        setIsCanvasPersistenceReady(true)
      }
    }

    void loadSavedCanvas()

    return () => abortController.abort()
  }, [
    edges.length,
    hasCanvasContent,
    nodes.length,
    onEdgesChange,
    onNodesChange,
    projectId,
  ])

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

  const handleConnect = useCallback(
    (connection: Connection) => {
      const edge: CanvasEdge = {
        id: `edge-${crypto.randomUUID()}`,
        data: {
          label: "",
        },
        interactionWidth: EDGE_INTERACTION_WIDTH,
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        target: connection.target,
        targetHandle: connection.targetHandle,
        type: CANVAS_EDGE_TYPE,
      }

      onEdgesChange([{ type: "add", item: edge }])
    },
    [onEdgesChange]
  )

  const handleCanvasMouseMove = useCallback(
    (event: ReactMouseEvent<Element>) => {
      if (reactFlowInstance === null) {
        return
      }

      updateMyPresence({
        cursor: reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
      })
    },
    [reactFlowInstance, updateMyPresence]
  )

  const handleCanvasMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])

  useEffect(() => {
    if (
      templateImportRequest === null ||
      lastTemplateImportRequestId.current ===
        templateImportRequest.requestId
    ) {
      return
    }

    lastTemplateImportRequestId.current = templateImportRequest.requestId

    const templateNodes =
      templateImportRequest.template.nodes.map(cloneTemplateNode)
    const templateEdges =
      templateImportRequest.template.edges.map(cloneTemplateEdge)
    const nodeAddChanges: NodeChange<CanvasNode>[] = templateNodes.map(
      (node, index) => ({
        index,
        item: node,
        type: "add",
      })
    )
    const edgeAddChanges: EdgeChange<CanvasEdge>[] = templateEdges.map(
      (edge, index) => ({
        index,
        item: edge,
        type: "add",
      })
    )

    if (nodes.length > 0 || edges.length > 0) {
      onDelete({ edges, nodes })
    }

    onNodesChange(nodeAddChanges)
    onEdgesChange(edgeAddChanges)

    setPendingCanvasFit({
      nodes: getCanvasFitNodes(templateNodes),
      requestId: templateImportRequest.requestId,
    })
  }, [
    edges,
    nodes,
    onDelete,
    onEdgesChange,
    onNodesChange,
    templateImportRequest,
  ])

  useEffect(() => {
    if (pendingCanvasFit === null || reactFlowInstance === null) {
      return
    }

    const currentNodesById = new Map(nodes.map((node) => [node.id, node]))
    const hasImportedNodes = pendingCanvasFit.nodes.every(
      (expectedNode) => {
        const currentNode = currentNodesById.get(expectedNode.id)

        return (
          currentNode !== undefined &&
          currentNode.position.x === expectedNode.x &&
          currentNode.position.y === expectedNode.y &&
          (currentNode.width ?? FALLBACK_NODE_SIZE.width) ===
            expectedNode.width &&
          (currentNode.height ?? FALLBACK_NODE_SIZE.height) ===
            expectedNode.height
        )
      }
    )

    if (!hasImportedNodes) {
      return
    }

    const fitFrameId = window.requestAnimationFrame(() => {
      void reactFlowInstance.fitView({
        duration: VIEWPORT_ANIMATION_DURATION,
        padding: 0.18,
      })
      setPendingCanvasFit((currentFit) =>
        currentFit?.requestId === pendingCanvasFit.requestId
          ? null
          : currentFit
      )
    })

    return () => window.cancelAnimationFrame(fitFrameId)
  }, [nodes, pendingCanvasFit, reactFlowInstance])

  const handleZoomOut = useCallback(() => {
    void reactFlowInstance?.zoomOut({
      duration: VIEWPORT_ANIMATION_DURATION,
    })
  }, [reactFlowInstance])

  const handleFitView = useCallback(() => {
    void reactFlowInstance?.fitView({
      duration: VIEWPORT_ANIMATION_DURATION,
    })
  }, [reactFlowInstance])

  const handleZoomIn = useCallback(() => {
    void reactFlowInstance?.zoomIn({
      duration: VIEWPORT_ANIMATION_DURATION,
    })
  }, [reactFlowInstance])

  const handleUndo = useCallback(() => {
    if (canUndo) {
      undo()
    }
  }, [canUndo, undo])

  const handleRedo = useCallback(() => {
    if (canRedo) {
      redo()
    }
  }, [canRedo, redo])

  useKeyboardShortcuts({
    onRedo: handleRedo,
    onUndo: handleUndo,
    reactFlowInstance,
  })

  return (
    <CanvasEditingContext.Provider value={canvasEditingContext}>
      <div className="relative h-full w-full">
        <ReactFlow<CanvasNode, CanvasEdge>
          className="bg-canvas"
          colorMode="dark"
          connectionLineStyle={connectionLineStyle}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={defaultEdgeOptions}
          edgeTypes={canvasEdgeTypes}
          edges={canvasEdges}
          fitView={shouldFitInitialView}
          nodeTypes={canvasNodeTypes}
          nodes={nodes}
          onConnect={handleConnect}
          onDelete={onDelete}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          onEdgesChange={onEdgesChange}
          onInit={setReactFlowInstance}
          onNodesChange={onNodesChange}
          onPaneMouseLeave={handleCanvasMouseLeave}
          onPaneMouseMove={handleCanvasMouseMove}
        >
          <Background
            bgColor="var(--bg-canvas)"
            color="var(--grid-line-strong)"
            gap={32}
            size={1.35}
            variant={BackgroundVariant.Dots}
          />
          <LiveCursors currentUserId={currentUserId} />
          <ParticipantAvatarGroup currentUserId={currentUserId} />
          <CanvasControlBar
            canRedo={canRedo}
            canUndo={canUndo}
            onFitView={handleFitView}
            onRedo={handleRedo}
            onUndo={handleUndo}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />
          <ShapePanel />
        </ReactFlow>
      </div>
    </CanvasEditingContext.Provider>
  )
}

function BaseCanvas({
  onManualSaveChange,
  onSaveStatusChange,
  projectId,
  roomId,
  templateImportRequest = null,
}: BaseCanvasProps) {
  return (
    <section className="relative min-w-0 flex-1 overflow-hidden bg-canvas">
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <CanvasErrorBoundary>
          <RoomProvider
            id={roomId}
            initialPresence={{
              cursor: null,
              thinking: false,
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
                  <SyncedReactFlowCanvas
                    onManualSaveChange={onManualSaveChange}
                    onSaveStatusChange={onSaveStatusChange}
                    projectId={projectId}
                    templateImportRequest={templateImportRequest}
                  />
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
