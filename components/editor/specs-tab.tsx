"use client"

import { useRealtimeRun, useRun } from "@trigger.dev/react-hooks"
import {
  Download,
  FileText,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { EditorDialogPattern } from "@/components/editor/dialog-pattern"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAiChatFeed } from "@/hooks/use-ai-chat-feed"
import { createCanvasSnapshot } from "@/lib/canvas-snapshot"
import { cn } from "@/lib/utils"
import type { generateSpec } from "@/trigger/generate-spec"
import type { CanvasSnapshot } from "@/types/canvas"

interface SpecsTabProps {
  canvasSnapshot: CanvasSnapshot | null
  projectId: string
  roomId: string
}

interface ProjectSpecSummary {
  id: string
  createdAt: string
  filename: string
}

interface ProjectSpecsResponse {
  specs: ProjectSpecSummary[]
}

interface ObservedSpecRun {
  id: string
  status: string
  finishedAt?: Date
  isCompleted: boolean
  isFailed: boolean
  isSuccess: boolean
  isCancelled: boolean
  metadata?: unknown
}

type MarkdownBlock =
  | {
      type: "heading"
      level: 1 | 2 | 3 | 4
      text: string
    }
  | {
      type: "paragraph"
      text: string
    }
  | {
      type: "unordered-list"
      items: string[]
    }
  | {
      type: "ordered-list"
      items: string[]
    }
  | {
      type: "blockquote"
      text: string
    }
  | {
      type: "code"
      language: string
      code: string
    }
  | {
      type: "table"
      rows: string[][]
    }

const INACTIVE_TRIGGER_ACCESS_TOKEN = "inactive"
const TERMINAL_RUN_STATUSES = new Set([
  "COMPLETED",
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
])
const SPEC_GENERATION_START_ERROR =
  "Couldn't start spec generation. Please try again."
const SPEC_GENERATION_FAILED_MESSAGE =
  "Spec generation failed. Please try again."

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isProjectSpecSummary(value: unknown): value is ProjectSpecSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.filename === "string"
  )
}

function isProjectSpecsResponse(value: unknown): value is ProjectSpecsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.specs) &&
    value.specs.every(isProjectSpecSummary)
  )
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error
  }

  return fallback
}

function isTerminalSpecRun(run: ObservedSpecRun) {
  return (
    run.finishedAt !== undefined ||
    run.isCompleted ||
    TERMINAL_RUN_STATUSES.has(run.status)
  )
}

function didSpecRunFail(run: ObservedSpecRun) {
  return (
    run.isFailed ||
    run.isCancelled ||
    (TERMINAL_RUN_STATUSES.has(run.status) && run.status !== "COMPLETED") ||
    (run.isCompleted && !run.isSuccess)
  )
}

function getSpecRunMessage(run: ObservedSpecRun | null) {
  if (run === null || !isRecord(run.metadata)) {
    return "Generating specification..."
  }

  const message = run.metadata.message

  return typeof message === "string" && message.trim().length > 0
    ? message
    : "Generating specification..."
}

function formatSpecDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Unknown date"
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getSpecsUrl(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/specs`
}

function getSpecDownloadUrl(projectId: string, specId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(
    specId
  )}/download`
}

function triggerSpecDownload(projectId: string, specId: string) {
  const link = document.createElement("a")

  link.href = getSpecDownloadUrl(projectId, specId)
  link.rel = "noopener noreferrer"
  document.body.append(link)
  link.click()
  link.remove()
}

function isBlankLine(line: string) {
  return line.trim().length === 0
}

function isFenceLine(line: string) {
  return line.trimStart().startsWith("```")
}

function getHeadingMatch(line: string) {
  return /^(#{1,4})\s+(.+)$/.exec(line)
}

function getUnorderedListMatch(line: string) {
  return /^\s*[-*]\s+(.+)$/.exec(line)
}

function getOrderedListMatch(line: string) {
  return /^\s*\d+\.\s+(.+)$/.exec(line)
}

function getBlockquoteMatch(line: string) {
  return /^\s*>\s?(.+)$/.exec(line)
}

function parseTableRow(line: string) {
  const trimmedLine = line.trim().replace(/^\|/, "").replace(/\|$/, "")

  return trimmedLine.split("|").map((cell) => cell.trim())
}

function isTableSeparator(line: string) {
  const cells = parseTableRow(line)

  return (
    cells.length > 1 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
  )
}

function startsBlock(line: string, nextLine?: string) {
  return (
    isBlankLine(line) ||
    isFenceLine(line) ||
    getHeadingMatch(line) !== null ||
    getUnorderedListMatch(line) !== null ||
    getOrderedListMatch(line) !== null ||
    getBlockquoteMatch(line) !== null ||
    (line.includes("|") &&
      nextLine !== undefined &&
      isTableSeparator(nextLine))
  )
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const nextLine = lines[index + 1]

    if (isBlankLine(line)) {
      index += 1
      continue
    }

    if (isFenceLine(line)) {
      const language = line.trim().slice(3).trim()
      const codeLines: string[] = []
      index += 1

      while (index < lines.length && !isFenceLine(lines[index])) {
        codeLines.push(lines[index])
        index += 1
      }

      if (index < lines.length) {
        index += 1
      }

      blocks.push({
        type: "code",
        language,
        code: codeLines.join("\n"),
      })
      continue
    }

    const headingMatch = getHeadingMatch(line)

    if (headingMatch !== null) {
      blocks.push({
        type: "heading",
        level: Math.min(headingMatch[1].length, 4) as 1 | 2 | 3 | 4,
        text: headingMatch[2].trim(),
      })
      index += 1
      continue
    }

    const unorderedListMatch = getUnorderedListMatch(line)

    if (unorderedListMatch !== null) {
      const items: string[] = []

      while (index < lines.length) {
        const itemMatch = getUnorderedListMatch(lines[index])

        if (itemMatch === null) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({ type: "unordered-list", items })
      continue
    }

    const orderedListMatch = getOrderedListMatch(line)

    if (orderedListMatch !== null) {
      const items: string[] = []

      while (index < lines.length) {
        const itemMatch = getOrderedListMatch(lines[index])

        if (itemMatch === null) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({ type: "ordered-list", items })
      continue
    }

    const blockquoteMatch = getBlockquoteMatch(line)

    if (blockquoteMatch !== null) {
      const quoteLines: string[] = []

      while (index < lines.length) {
        const quoteMatch = getBlockquoteMatch(lines[index])

        if (quoteMatch === null) {
          break
        }

        quoteLines.push(quoteMatch[1].trim())
        index += 1
      }

      blocks.push({
        type: "blockquote",
        text: quoteLines.join(" "),
      })
      continue
    }

    if (
      line.includes("|") &&
      nextLine !== undefined &&
      isTableSeparator(nextLine)
    ) {
      const rows = [parseTableRow(line)]
      index += 2

      while (index < lines.length && lines[index].includes("|")) {
        rows.push(parseTableRow(lines[index]))
        index += 1
      }

      blocks.push({ type: "table", rows })
      continue
    }

    const paragraphLines = [line.trim()]
    index += 1

    while (
      index < lines.length &&
      !startsBlock(lines[index], lines[index + 1])
    ) {
      paragraphLines.push(lines[index].trim())
      index += 1
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
    })
  }

  return blocks
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded bg-subtle px-1 py-0.5 font-mono text-[0.8em] text-ai-text"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-copy-primary">
          {part.slice(2, -2)}
        </strong>
      )
    }

    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown])

  if (blocks.length === 0) {
    return (
      <p className="p-4 text-sm leading-6 text-copy-muted">
        The saved spec is empty.
      </p>
    )
  }

  return (
    <div className="space-y-4 p-4 text-sm leading-6 text-copy-secondary">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const headingClassName = cn(
            "font-semibold text-copy-primary",
            block.level === 1 && "text-base",
            block.level === 2 && "text-sm",
            block.level >= 3 && "text-xs uppercase"
          )

          return (
            <div key={`${block.type}-${index}`} className={headingClassName}>
              {renderInlineMarkdown(block.text)}
            </div>
          )
        }

        if (block.type === "paragraph") {
          return (
            <p key={`${block.type}-${index}`} className="text-copy-secondary">
              {renderInlineMarkdown(block.text)}
            </p>
          )
        }

        if (block.type === "unordered-list") {
          return (
            <ul
              key={`${block.type}-${index}`}
              className="list-disc space-y-1 pl-5 text-copy-secondary"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          )
        }

        if (block.type === "ordered-list") {
          return (
            <ol
              key={`${block.type}-${index}`}
              className="list-decimal space-y-1 pl-5 text-copy-secondary"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
              ))}
            </ol>
          )
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={`${block.type}-${index}`}
              className="border-l-2 border-brand pl-3 text-copy-muted"
            >
              {renderInlineMarkdown(block.text)}
            </blockquote>
          )
        }

        if (block.type === "code") {
          return (
            <pre
              key={`${block.type}-${index}`}
              className="overflow-x-auto rounded-md border border-surface-border bg-base p-3 font-mono text-xs leading-5 text-copy-secondary"
            >
              {block.language.length > 0 ? (
                <div className="mb-2 text-[0.65rem] uppercase text-copy-faint">
                  {block.language}
                </div>
              ) : null}
              <code>{block.code}</code>
            </pre>
          )
        }

        return (
          <div
            key={`${block.type}-${index}`}
            className="overflow-x-auto rounded-md border border-surface-border"
          >
            <table className="w-full border-collapse text-left text-xs">
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr
                    key={`${row.join("-")}-${rowIndex}`}
                    className="border-b border-surface-border last:border-b-0"
                  >
                    {row.map((cell, cellIndex) => {
                      const Cell = rowIndex === 0 ? "th" : "td"

                      return (
                        <Cell
                          key={`${cell}-${cellIndex}`}
                          className={cn(
                            "border-r border-surface-border px-3 py-2 last:border-r-0",
                            rowIndex === 0
                              ? "bg-subtle font-medium text-copy-primary"
                              : "text-copy-secondary"
                          )}
                        >
                          {renderInlineMarkdown(cell)}
                        </Cell>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function SpecsStatus({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-52 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border-subtle bg-elevated/40 px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border bg-subtle text-ai-text">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-copy-secondary">{title}</p>
      <p className="mt-2 text-xs leading-5 text-copy-muted">{description}</p>
    </div>
  )
}

function SpecListItem({
  projectId,
  spec,
  onPreview,
}: {
  projectId: string
  spec: ProjectSpecSummary
  onPreview: (spec: ProjectSpecSummary) => void
}) {
  const createdAtLabel = formatSpecDate(spec.createdAt)

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 rounded-lg border border-surface-border bg-elevated/60 p-2 transition-colors hover:border-surface-border-subtle">
      <button
        type="button"
        className="min-w-0 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onPreview(spec)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-surface-border bg-subtle text-ai-text">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-copy-primary">
              {spec.filename}
            </span>
            <time
              className="mt-1 block truncate text-xs text-copy-muted"
              dateTime={spec.createdAt}
            >
              {createdAtLabel}
            </time>
          </span>
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="self-center rounded-md text-copy-muted hover:text-copy-primary"
        aria-label={`Download ${spec.filename}`}
        title={`Download ${spec.filename}`}
        onClick={() => triggerSpecDownload(projectId, spec.id)}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  )
}

function SpecsTab({ canvasSnapshot, projectId, roomId }: SpecsTabProps) {
  const specsUrl = useMemo(() => getSpecsUrl(projectId), [projectId])
  const { entries: chatEntries } = useAiChatFeed()
  const [specs, setSpecs] = useState<ProjectSpecSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generationErrorMessage, setGenerationErrorMessage] = useState<
    string | null
  >(null)
  const [activeRun, setActiveRun] = useState<{
    runId: string
    token: string
  } | null>(null)
  const [selectedSpec, setSelectedSpec] = useState<ProjectSpecSummary | null>(
    null
  )
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(
    null
  )
  const trackedRunId = activeRun?.runId ?? ""
  const triggerAccessToken = activeRun?.token ?? INACTIVE_TRIGGER_ACCESS_TOKEN
  const { run: realtimeRun } = useRealtimeRun<typeof generateSpec>(
    trackedRunId,
    {
      id: trackedRunId,
      accessToken: activeRun?.token,
      enabled: activeRun !== null,
    }
  )
  const { run: polledRun } = useRun<typeof generateSpec>(trackedRunId, {
    accessToken: triggerAccessToken,
    refreshInterval: activeRun === null ? 0 : 2_500,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const observedRun =
    activeRun === null
      ? null
      : realtimeRun?.id === activeRun.runId
        ? realtimeRun
        : polledRun?.id === activeRun.runId
          ? polledRun
          : null
  const isGenerating = activeRun !== null
  const isGenerateBusy = isGenerating || isSubmitting
  const isGenerateDisabled = isGenerateBusy || canvasSnapshot === null

  const loadSpecs = useCallback(
    async (signal?: AbortSignal) => {
      await Promise.resolve()

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(specsUrl, { signal })
        const payload = await readJson(response)

        if (!response.ok) {
          setErrorMessage(
            getApiErrorMessage(payload, "Unable to load specs.")
          )
          return
        }

        if (!isProjectSpecsResponse(payload)) {
          setErrorMessage("The specs response was invalid.")
          return
        }

        setSpecs(payload.specs)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setErrorMessage("Unable to load specs.")
      } finally {
        setIsLoading(false)
      }
    },
    [specsUrl]
  )

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void loadSpecs(controller.signal)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [loadSpecs])

  useEffect(() => {
    if (activeRun === null || observedRun === null) {
      return
    }

    if (!isTerminalSpecRun(observedRun)) {
      return
    }

    void Promise.resolve().then(() => {
      if (didSpecRunFail(observedRun)) {
        setGenerationErrorMessage(SPEC_GENERATION_FAILED_MESSAGE)
      } else {
        setGenerationErrorMessage(null)
        void loadSpecs()
      }

      setActiveRun((current) =>
        current?.runId === observedRun.id ? null : current
      )
    })
  }, [activeRun, loadSpecs, observedRun])

  useEffect(() => {
    if (selectedSpec === null) {
      return
    }

    const spec = selectedSpec
    const controller = new AbortController()

    async function loadPreview() {
      setIsPreviewLoading(true)
      setPreviewErrorMessage(null)
      setPreviewMarkdown(null)

      try {
        const response = await fetch(
          getSpecDownloadUrl(projectId, spec.id),
          {
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          const payload = await readJson(response)
          setPreviewErrorMessage(
            getApiErrorMessage(payload, "Unable to load spec preview.")
          )
          return
        }

        setPreviewMarkdown(await response.text())
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setPreviewErrorMessage("Unable to load spec preview.")
      } finally {
        setIsPreviewLoading(false)
      }
    }

    void loadPreview()

    return () => controller.abort()
  }, [projectId, selectedSpec])

  function openPreview(spec: ProjectSpecSummary) {
    setPreviewMarkdown(null)
    setPreviewErrorMessage(null)
    setIsPreviewLoading(false)
    setSelectedSpec(spec)
  }

  function closePreview() {
    setSelectedSpec(null)
    setPreviewMarkdown(null)
    setPreviewErrorMessage(null)
    setIsPreviewLoading(false)
  }

  async function startSpecGeneration() {
    if (isGenerateDisabled || canvasSnapshot === null) {
      return
    }

    setIsSubmitting(true)
    setGenerationErrorMessage(null)

    try {
      const snapshot = createCanvasSnapshot(
        canvasSnapshot.nodes,
        canvasSnapshot.edges
      )
      const chatHistory = chatEntries.map((entry) => ({
        role: entry.role,
        content: entry.content,
        sender: entry.sender,
      }))
      const specResponse = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          chatHistory,
          nodes: snapshot.nodes,
          edges: snapshot.edges,
        }),
      })
      const specData = (await specResponse.json().catch(() => null)) as {
        runId?: unknown
      } | null

      if (
        !specResponse.ok ||
        specData === null ||
        typeof specData.runId !== "string" ||
        specData.runId.length === 0
      ) {
        throw new Error("Spec request failed")
      }

      const tokenResponse = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: specData.runId }),
      })
      const tokenData = (await tokenResponse.json().catch(() => null)) as {
        token?: unknown
      } | null

      if (
        !tokenResponse.ok ||
        tokenData === null ||
        typeof tokenData.token !== "string" ||
        tokenData.token.length === 0
      ) {
        throw new Error("Spec token request failed")
      }

      setActiveRun({ runId: specData.runId, token: tokenData.token })
    } catch {
      setGenerationErrorMessage(SPEC_GENERATION_START_ERROR)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-4 shrink-0">
          <Button
            type="button"
            className="w-full rounded-md border border-ai/40 bg-ai/15 text-ai-text hover:bg-ai/20 disabled:opacity-50"
            disabled={isGenerateDisabled}
            onClick={startSpecGeneration}
          >
            {isGenerateBusy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4" aria-hidden="true" />
            )}
            Generate Spec
          </Button>

          {isGenerating ? (
            <div
              className="mt-3 flex items-center gap-2 rounded-md border border-surface-border bg-elevated px-3 py-2"
              role="status"
              aria-live="polite"
            >
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ai-text opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ai-text" />
              </span>
              <span className="min-w-0 flex flex-col gap-1">
                <span className="truncate text-xs leading-none text-copy-secondary">
                  {getSpecRunMessage(observedRun)}
                </span>
                <span className="text-[0.65rem] leading-none text-copy-faint">
                  Est. time 1-3 min
                </span>
              </span>
            </div>
          ) : null}

          {generationErrorMessage !== null ? (
            <div
              className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs leading-snug text-destructive"
              role="alert"
            >
              {generationErrorMessage}
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <SpecsStatus
            icon={
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
            }
            title="Loading specs"
            description="Generated specs are being loaded."
          />
        ) : errorMessage !== null ? (
          <SpecsStatus
            icon={<TriangleAlert className="h-5 w-5" aria-hidden="true" />}
            title="Specs unavailable"
            description={errorMessage}
          />
        ) : specs.length === 0 ? (
          <SpecsStatus
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
            title="No specs yet"
            description="Generated specs for this project will appear here."
          />
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <ul className="flex flex-col gap-2 pr-3">
              {specs.map((spec) => (
                <SpecListItem
                  key={spec.id}
                  projectId={projectId}
                  spec={spec}
                  onPreview={openPreview}
                />
              ))}
            </ul>
          </ScrollArea>
        )}
      </div>

      <Dialog
        open={selectedSpec !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closePreview()
          }
        }}
      >
        <EditorDialogPattern
          title={selectedSpec?.filename ?? "Spec Preview"}
          description={
            selectedSpec === null ? undefined : formatSpecDate(selectedSpec.createdAt)
          }
          className="sm:max-w-3xl"
          footerActions={
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-md border-surface-border bg-surface text-copy-primary"
                onClick={closePreview}
              >
                Close
              </Button>
              <Button
                type="button"
                className="rounded-md bg-ai text-primary-foreground hover:bg-ai/90"
                disabled={selectedSpec === null}
                onClick={() => {
                  if (selectedSpec !== null) {
                    triggerSpecDownload(projectId, selectedSpec.id)
                  }
                }}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </Button>
            </>
          }
        >
          <ScrollArea className="max-h-[min(60dvh,34rem)] rounded-lg border border-surface-border bg-surface">
            {isPreviewLoading ? (
              <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-copy-muted">
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Loading preview
              </div>
            ) : previewErrorMessage !== null ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center text-sm text-copy-muted">
                <TriangleAlert
                  className="mb-3 h-5 w-5 text-state-warning"
                  aria-hidden="true"
                />
                {previewErrorMessage}
              </div>
            ) : previewMarkdown !== null ? (
              <MarkdownPreview markdown={previewMarkdown} />
            ) : (
              <div className="min-h-64" />
            )}
          </ScrollArea>
        </EditorDialogPattern>
      </Dialog>
    </>
  )
}

export { SpecsTab }
