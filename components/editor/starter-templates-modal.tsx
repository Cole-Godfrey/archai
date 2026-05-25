"use client"

import { Upload } from "lucide-react"

import { EditorDialogPattern } from "@/components/editor/dialog-pattern"
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas"

interface StarterTemplatesModalProps {
  open: boolean
  onImport: (template: CanvasTemplate) => void
  onOpenChange: (open: boolean) => void
}

interface TemplatePreviewNodeGeometry {
  centerX: number
  centerY: number
  height: number
  node: CanvasNode
  width: number
  x: number
  y: number
}

interface TemplatePreviewEdgeGeometry {
  edge: CanvasEdge
  source: TemplatePreviewNodeGeometry
  target: TemplatePreviewNodeGeometry
}

interface TemplateBounds {
  height: number
  maxX: number
  maxY: number
  minX: number
  minY: number
  width: number
}

const PREVIEW_WIDTH = 320
const PREVIEW_HEIGHT = 156
const PREVIEW_PADDING = 18
const PREVIEW_FALLBACK_NODE_WIDTH = 120
const PREVIEW_FALLBACK_NODE_HEIGHT = 72
const PREVIEW_EDGE_STROKE_WIDTH = 1.35

function getNodeColor(colorId: CanvasNode["data"]["color"]) {
  return NODE_COLORS.find((color) => color.id === colorId) ?? NODE_COLORS[0]
}

function getNodeWidth(node: CanvasNode) {
  return typeof node.width === "number"
    ? node.width
    : PREVIEW_FALLBACK_NODE_WIDTH
}

function getNodeHeight(node: CanvasNode) {
  return typeof node.height === "number"
    ? node.height
    : PREVIEW_FALLBACK_NODE_HEIGHT
}

function getTemplateBounds(nodes: CanvasNode[]): TemplateBounds {
  if (nodes.length === 0) {
    return {
      height: PREVIEW_FALLBACK_NODE_HEIGHT,
      maxX: PREVIEW_FALLBACK_NODE_WIDTH,
      maxY: PREVIEW_FALLBACK_NODE_HEIGHT,
      minX: 0,
      minY: 0,
      width: PREVIEW_FALLBACK_NODE_WIDTH,
    }
  }

  const bounds = nodes.reduce(
    (currentBounds, node) => {
      const nodeWidth = getNodeWidth(node)
      const nodeHeight = getNodeHeight(node)
      const nodeMaxX = node.position.x + nodeWidth
      const nodeMaxY = node.position.y + nodeHeight

      return {
        maxX: Math.max(currentBounds.maxX, nodeMaxX),
        maxY: Math.max(currentBounds.maxY, nodeMaxY),
        minX: Math.min(currentBounds.minX, node.position.x),
        minY: Math.min(currentBounds.minY, node.position.y),
      }
    },
    {
      maxX: -Infinity,
      maxY: -Infinity,
      minX: Infinity,
      minY: Infinity,
    }
  )
  const width = Math.max(1, bounds.maxX - bounds.minX)
  const height = Math.max(1, bounds.maxY - bounds.minY)

  return {
    ...bounds,
    height,
    width,
  }
}

function getPreviewNodeGeometry(
  node: CanvasNode,
  bounds: TemplateBounds,
  scale: number,
  offsetX: number,
  offsetY: number
): TemplatePreviewNodeGeometry {
  const width = getNodeWidth(node) * scale
  const height = getNodeHeight(node) * scale
  const x = offsetX + (node.position.x - bounds.minX) * scale
  const y = offsetY + (node.position.y - bounds.minY) * scale

  return {
    centerX: x + width / 2,
    centerY: y + height / 2,
    height,
    node,
    width,
    x,
    y,
  }
}

function getPreviewGeometry(template: CanvasTemplate) {
  const bounds = getTemplateBounds(template.nodes)
  const availableWidth = PREVIEW_WIDTH - PREVIEW_PADDING * 2
  const availableHeight = PREVIEW_HEIGHT - PREVIEW_PADDING * 2
  const scale = Math.min(
    availableWidth / bounds.width,
    availableHeight / bounds.height
  )
  const renderedWidth = bounds.width * scale
  const renderedHeight = bounds.height * scale
  const offsetX = (PREVIEW_WIDTH - renderedWidth) / 2
  const offsetY = (PREVIEW_HEIGHT - renderedHeight) / 2
  const nodes = template.nodes.map((node) =>
    getPreviewNodeGeometry(node, bounds, scale, offsetX, offsetY)
  )
  const nodesById = new Map(nodes.map((node) => [node.node.id, node]))
  const edges = template.edges.reduce<TemplatePreviewEdgeGeometry[]>(
    (previewEdges, edge) => {
      const source = nodesById.get(edge.source)
      const target = nodesById.get(edge.target)

      if (source === undefined || target === undefined) {
        return previewEdges
      }

      previewEdges.push({ edge, source, target })

      return previewEdges
    },
    []
  )

  return { edges, nodes }
}

function TemplatePreviewShape({
  height,
  node,
  width,
  x,
  y,
}: TemplatePreviewNodeGeometry) {
  const color = getNodeColor(node.data.color)
  const borderColor = "var(--border-subtle)"

  if (node.data.shape === "rectangle") {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="5"
        fill={color.fill}
        stroke={borderColor}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (node.data.shape === "pill" || node.data.shape === "circle") {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={height / 2}
        fill={color.fill}
        stroke={borderColor}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (node.data.shape === "diamond") {
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <polygon
        points={`${centerX},${y} ${x + width},${centerY} ${centerX},${
          y + height
        } ${x},${centerY}`}
        fill={color.fill}
        stroke={borderColor}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (node.data.shape === "hexagon") {
    return (
      <polygon
        points={`${x + width * 0.25},${y} ${x + width * 0.75},${y} ${
          x + width
        },${y + height / 2} ${x + width * 0.75},${y + height} ${
          x + width * 0.25
        },${y + height} ${x},${y + height / 2}`}
        fill={color.fill}
        stroke={borderColor}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M8 18 V82 C8 93 92 93 92 82 V18 Z"
        fill={color.fill}
        stroke="none"
      />
      <path
        d="M8 18 V82 C8 93 92 93 92 82 V18"
        fill="none"
        stroke={borderColor}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <ellipse
        cx="50"
        cy="18"
        rx="42"
        ry="12"
        fill={color.fill}
        stroke={borderColor}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function TemplatePreviewNode(geometry: TemplatePreviewNodeGeometry) {
  return (
    <TemplatePreviewShape {...geometry} />
  )
}

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const { edges, nodes } = getPreviewGeometry(template)

  return (
    <svg
      className="h-36 w-full rounded-md border border-surface-border bg-canvas"
      viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
      role="img"
      aria-label={`${template.name} diagram preview`}
    >
      <rect
        x="0"
        y="0"
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        fill="var(--bg-canvas)"
      />
      {edges.map(({ edge, source, target }) => (
        <line
          key={edge.id}
          x1={source.centerX}
          y1={source.centerY}
          x2={target.centerX}
          y2={target.centerY}
          stroke="var(--line-strong)"
          strokeLinecap="round"
          strokeOpacity="0.62"
          strokeWidth={PREVIEW_EDGE_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {nodes.map((node) => (
        <TemplatePreviewNode key={node.node.id} {...node} />
      ))}
    </svg>
  )
}

function StarterTemplatesModal({
  open,
  onImport,
  onOpenChange,
}: StarterTemplatesModalProps) {
  function importTemplate(template: CanvasTemplate) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorDialogPattern
        title="Starter Templates"
        description="Replace the current canvas with a predefined architecture diagram."
        className="max-h-[calc(100dvh-2rem)] sm:max-w-5xl"
      >
        <ScrollArea className="max-h-[min(72dvh,42rem)] pr-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CANVAS_TEMPLATES.map((template) => (
              <article
                key={template.id}
                className="grid min-h-0 gap-3 rounded-lg border border-surface-border bg-surface p-3"
              >
                <TemplatePreview template={template} />
                <div className="grid gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-copy-primary">
                      {template.name}
                    </h3>
                    <p className="mt-1 min-h-12 text-xs leading-5 text-copy-muted">
                      {template.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "rounded-md border-surface-border bg-elevated text-copy-secondary",
                      "hover:bg-subtle hover:text-brand"
                    )}
                    onClick={() => importTemplate(template)}
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Import
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </ScrollArea>
      </EditorDialogPattern>
    </Dialog>
  )
}

export { StarterTemplatesModal }
