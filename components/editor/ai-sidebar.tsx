"use client"

import { useRealtimeRun, useRun } from "@trigger.dev/react-hooks"
import { Bot, Download, FileText, LoaderCircle, Send, X } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAiActivityStatus } from "@/hooks/use-ai-activity-status"
import { useAiChatFeed, type AiChatFeedEntry } from "@/hooks/use-ai-chat-feed"
import { cn } from "@/lib/utils"
import type { designAgentTask } from "@/trigger/design-agent"

const starterPrompts = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

const GENERATION_START_ERROR =
  "Couldn't start design generation. Please try again."
const GENERATION_FAILED_MESSAGE =
  "Design generation failed. The canvas was not changed."
const GENERATION_COMPLETE_MESSAGE = "Design updated on the canvas."
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

interface AISidebarProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  projectId: string
  getViewportCenter?: (() => { x: number; y: number } | null) | null
  className?: string
}

function formatChatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface ObservedDesignRun {
  id: string
  status: string
  finishedAt?: Date
  isCompleted: boolean
  isFailed: boolean
  isSuccess: boolean
  isCancelled: boolean
  output?: {
    summary?: string
  }
}

function isTerminalDesignRun(run: ObservedDesignRun) {
  return (
    run.finishedAt !== undefined ||
    run.isCompleted ||
    TERMINAL_RUN_STATUSES.has(run.status)
  )
}

function didDesignRunFail(run: ObservedDesignRun) {
  return (
    run.isFailed ||
    run.isCancelled ||
    (TERMINAL_RUN_STATUSES.has(run.status) && run.status !== "COMPLETED") ||
    (run.isCompleted && !run.isSuccess)
  )
}

function EmptyArchitectState({
  onSelectPrompt,
  disabled,
}: {
  onSelectPrompt: (prompt: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-2 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border bg-elevated text-ai-text">
        <Bot className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-medium text-copy-primary">
        Start with a system prompt.
      </p>
      <p className="mt-2 max-w-64 text-xs leading-5 text-copy-muted">
        Describe the architecture you want to draft, then refine it with
        constraints and tradeoffs.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {starterPrompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto rounded-full bg-subtle px-3 py-1.5 text-left text-xs font-medium text-ai-text hover:bg-ai/15 hover:text-ai-text"
            disabled={disabled}
            onClick={() => onSelectPrompt(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}

function ChatBubble({ entry }: { entry: AiChatFeedEntry }) {
  const isUser = entry.role === "user"

  return (
    <div className={cn("flex", entry.isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-1 rounded-lg px-3 py-2 text-sm leading-5",
          isUser
            ? "bg-ai text-primary-foreground"
            : "border border-surface-border bg-elevated text-copy-primary"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "truncate text-xs font-medium",
              isUser ? "text-primary-foreground/70" : "text-copy-secondary"
            )}
          >
            {entry.sender}
          </span>
          <time
            className={cn(
              "shrink-0 text-[0.65rem] uppercase tracking-wide",
              isUser ? "text-primary-foreground/60" : "text-copy-faint"
            )}
          >
            {formatChatTimestamp(entry.timestamp)}
          </time>
        </div>
        <p className="whitespace-pre-wrap break-words">{entry.content}</p>
      </div>
    </div>
  )
}

function ArchitectTab({
  roomId,
  projectId,
  getViewportCenter,
}: {
  roomId: string
  projectId: string
  getViewportCenter?: (() => { x: number; y: number } | null) | null
}) {
  const { statusText } = useAiActivityStatus()
  const { entries, sendMessage, sendAssistantMessage, sendError, clearError } =
    useAiChatFeed()
  const [draft, setDraft] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeRun, setActiveRun] = useState<{
    runId: string
    token: string
  } | null>(null)
  const handledRunIdRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const trackedRunId = activeRun?.runId ?? ""
  const triggerAccessToken = activeRun?.token ?? INACTIVE_TRIGGER_ACCESS_TOKEN

  // Track the submitted run with its run-scoped token. Realtime gives fast
  // updates; polling is a fallback for missed SSE completion events.
  const { run: realtimeRun } = useRealtimeRun<typeof designAgentTask>(
    trackedRunId,
    {
      id: trackedRunId,
      accessToken: activeRun?.token,
      enabled: activeRun !== null,
    }
  )
  const { run: polledRun } = useRun<typeof designAgentTask>(trackedRunId, {
    // `useRun` has no typed `enabled` option and validates auth during render.
    // The empty run id disables SWR fetching while inactive, so this token is
    // never sent; it only keeps the hook renderable before a run exists.
    accessToken: triggerAccessToken,
    refreshInterval: activeRun === null ? 0 : 2_500,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  const finishDesignRun = useCallback(
    (completedRun: ObservedDesignRun) => {
      if (handledRunIdRef.current === completedRun.id) {
        setActiveRun((current) =>
          current?.runId === completedRun.id ? null : current
        )
        return
      }

      handledRunIdRef.current = completedRun.id

      if (didDesignRunFail(completedRun)) {
        void sendAssistantMessage(GENERATION_FAILED_MESSAGE)
      } else {
        const summary = (completedRun.output?.summary ?? "").trim()
        void sendAssistantMessage(
          summary.length > 0 ? summary : GENERATION_COMPLETE_MESSAGE
        )
      }

      setActiveRun((current) =>
        current?.runId === completedRun.id ? null : current
      )
    },
    [sendAssistantMessage]
  )

  useEffect(() => {
    if (activeRun === null) {
      return
    }

    const observedRun =
      realtimeRun?.id === activeRun.runId
        ? realtimeRun
        : polledRun?.id === activeRun.runId
          ? polledRun
          : null

    if (observedRun === null || !isTerminalDesignRun(observedRun)) {
      return
    }

    finishDesignRun(observedRun)
  }, [activeRun, finishDesignRun, polledRun, realtimeRun])

  const isRunning = activeRun !== null
  const isBusy = isRunning || isSubmitting

  useEffect(() => {
    if (entries.length === 0) {
      return
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [entries.length])

  function resizeTextarea(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }

  function resetTextarea() {
    requestAnimationFrame(() => {
      if (!textareaRef.current) {
        return
      }

      textareaRef.current.style.height = ""
    })
  }

  // Trigger generation, then resolve a run-scoped token for realtime tracking.
  // Backend errors surface as an assistant message in the shared chat feed.
  async function startDesignRun(prompt: string) {
    try {
      const viewportCenter = getViewportCenter?.() ?? null
      const designResponse = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, roomId, projectId, viewportCenter }),
      })

      if (!designResponse.ok) {
        throw new Error("Design request failed")
      }

      const designData = (await designResponse.json()) as { runId?: unknown }

      if (
        typeof designData.runId !== "string" ||
        designData.runId.length === 0
      ) {
        throw new Error("Design response was missing a run id")
      }

      const tokenResponse = await fetch("/api/ai/design/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: designData.runId }),
      })

      if (!tokenResponse.ok) {
        throw new Error("Token request failed")
      }

      const tokenData = (await tokenResponse.json()) as { token?: unknown }

      if (typeof tokenData.token !== "string" || tokenData.token.length === 0) {
        throw new Error("Token response was missing a token")
      }

      return { runId: designData.runId, token: tokenData.token }
    } catch {
      await sendAssistantMessage(GENERATION_START_ERROR)
      return null
    }
  }

  async function submitPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt || isBusy) {
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Push the participant's prompt to the shared chat feed.
      const didSend = await sendMessage(trimmedPrompt)

      if (!didSend) {
        return
      }

      setDraft("")
      resetTextarea()

      // 2. Kick off generation and hand the run to the status hooks above.
      const runInfo = await startDesignRun(trimmedPrompt)

      if (runInfo !== null) {
        handledRunIdRef.current = null
        setActiveRun(runInfo)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitPrompt(draft)
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return
    }

    event.preventDefault()
    void submitPrompt(draft)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="min-h-full px-4 py-4">
          {entries.length > 0 ? (
            <div className="flex flex-col gap-3">
              {entries.map((entry) => (
                <ChatBubble key={entry.id} entry={entry} />
              ))}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          ) : (
            <EmptyArchitectState
              onSelectPrompt={submitPrompt}
              disabled={isBusy}
            />
          )}
        </div>
      </ScrollArea>

      <form
        className="shrink-0 border-t border-surface-border p-4"
        onSubmit={handleSubmit}
      >
        {sendError !== null && (
          <div
            className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs leading-snug text-destructive"
            role="alert"
          >
            {sendError}
          </div>
        )}
        {isRunning && (
          <div
            className="mb-3 flex items-center gap-2 rounded-md border border-surface-border bg-elevated px-3 py-2"
            role="status"
            aria-live="polite"
          >
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ai-text opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ai-text" />
            </span>
            <span className="truncate text-xs leading-none text-copy-secondary">
              {statusText ?? "Archai is working…"}
            </span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            placeholder="Message the room..."
            className="max-h-40 min-h-[72px] resize-none overflow-y-auto rounded-md border-surface-border bg-elevated text-sm text-copy-primary placeholder:text-copy-faint focus-visible:border-ai focus-visible:ring-ai/25"
            disabled={isBusy}
            onChange={(event) => {
              setDraft(event.currentTarget.value)
              resizeTextarea(event.currentTarget)

              if (sendError !== null) {
                clearError()
              }
            }}
            onKeyDown={handleDraftKeyDown}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-md bg-ai text-primary-foreground hover:bg-ai/90 disabled:opacity-40"
            disabled={isBusy || !draft.trim()}
            aria-label="Send message"
            title="Send message"
          >
            {isBusy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function SpecsTab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <Button
        type="button"
        className="w-full rounded-md border border-ai/40 bg-ai/15 text-ai-text hover:bg-ai/20"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        Generate Spec
      </Button>

      <Card className="rounded-lg border border-surface-border bg-elevated text-copy-primary ring-0">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-surface-border bg-subtle text-ai-text">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium leading-snug">
              System Architecture Spec
            </h3>
            <p className="mt-1 text-xs text-copy-muted">Draft preview</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-md border-surface-border bg-surface text-copy-faint"
            disabled
            aria-label="Download spec"
            title="Download spec"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="px-4">
          <p className="text-xs leading-5 text-copy-muted">
            This workspace spec will summarize services, data stores, external
            systems, and operational boundaries from the canvas graph.
          </p>
        </div>
      </Card>
    </div>
  )
}

function AISidebar({
  isOpen,
  onClose,
  roomId,
  projectId,
  getViewportCenter,
  className,
}: AISidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      aria-label="AI workspace"
      inert={!isOpen}
      className={cn(
        "fixed bottom-4 right-4 top-[4.5rem] z-40 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-glass shadow-xl backdrop-blur-md transition-[opacity,transform] duration-300 ease-out",
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-[calc(100%+2rem)] opacity-0",
        className
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-surface-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-surface-border bg-elevated text-ai-text">
            <Bot className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-copy-primary">
              AI Workspace
            </h2>
            <p className="truncate text-xs text-copy-muted">
              Collaborate with Archai
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-md text-copy-muted hover:text-copy-primary"
          aria-label="Close AI workspace"
          title="Close AI workspace"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <Tabs defaultValue="architect" className="min-h-0 flex-1 gap-0">
        <div className="border-b border-surface-border px-4 py-3">
          <TabsList className="grid h-9 w-full grid-cols-2 bg-subtle">
            <TabsTrigger
              value="architect"
              className="rounded-md text-copy-muted data-active:border-ai/40 data-active:bg-ai/15 data-active:text-ai-text"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="rounded-md text-copy-muted data-active:border-ai/40 data-active:bg-ai/15 data-active:text-ai-text"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="architect"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <ArchitectTab
            roomId={roomId}
            projectId={projectId}
            getViewportCenter={getViewportCenter}
          />
        </TabsContent>
        <TabsContent
          value="specs"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </aside>
  )
}

export { AISidebar }
