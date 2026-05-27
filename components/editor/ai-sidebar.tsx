"use client"

import { Bot, Download, FileText, Send, X } from "lucide-react"
import {
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
import { cn } from "@/lib/utils"

const starterPrompts = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

interface AISidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

function EmptyArchitectState({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void
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
            className="h-auto rounded-full bg-subtle px-3 py-1.5 text-left text-xs font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => onSelectPrompt(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUserMessage = message.role === "user"

  return (
    <div className={cn("flex", isUserMessage ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-5",
          isUserMessage
            ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
            : "border border-surface-border bg-elevated text-accent-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function ArchitectTab() {
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messageIdRef = useRef(0)

  useEffect(() => {
    if (messages.length === 0) {
      return
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [messages.length])

  function nextMessageId(role: ChatMessage["role"]) {
    messageIdRef.current += 1
    return `${role}-${messageIdRef.current}`
  }

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

  function submitPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: nextMessageId("user"),
        role: "user",
        content: trimmedPrompt,
      },
      {
        id: nextMessageId("assistant"),
        role: "assistant",
        content:
          "I can use that as the working brief. Add scale, data, or integration constraints to sharpen the architecture pass.",
      },
    ])
    setDraft("")
    resetTextarea()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitPrompt(draft)
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return
    }

    event.preventDefault()
    submitPrompt(draft)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="min-h-full px-4 py-4">
          {messages.length > 0 ? (
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          ) : (
            <EmptyArchitectState onSelectPrompt={submitPrompt} />
          )}
        </div>
      </ScrollArea>

      <form
        className="shrink-0 border-t border-surface-border p-4"
        onSubmit={handleSubmit}
      >
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            placeholder="Ask Archai to draft an architecture..."
            className="max-h-40 min-h-[72px] resize-none overflow-y-auto rounded-md border-surface-border bg-elevated text-sm text-copy-primary placeholder:text-copy-faint focus-visible:border-brand focus-visible:ring-brand/25"
            onChange={(event) => {
              setDraft(event.currentTarget.value)
              resizeTextarea(event.currentTarget)
            }}
            onKeyDown={handleDraftKeyDown}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-md border border-brand/40 bg-accent text-accent-foreground hover:bg-brand/20 disabled:opacity-40"
            disabled={!draft.trim()}
            aria-label="Send message"
            title="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
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
        className="w-full rounded-md border border-brand/40 bg-accent text-accent-foreground hover:bg-brand/20"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        Generate Spec
      </Button>

      <Card className="rounded-lg border border-surface-border bg-elevated text-copy-primary ring-0">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-surface-border bg-subtle text-accent-foreground">
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

function AISidebar({ isOpen, onClose, className }: AISidebarProps) {
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
              className="rounded-md text-copy-muted data-active:border-brand/40 data-active:bg-accent data-active:text-accent-foreground"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="rounded-md text-copy-muted data-active:border-brand/40 data-active:bg-accent data-active:text-accent-foreground"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="architect"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <ArchitectTab />
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
