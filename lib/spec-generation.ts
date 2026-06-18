import {
  createGoogleGenerativeAI,
  type GoogleLanguageModelOptions,
} from "@ai-sdk/google"
import { generateText } from "ai"
import { z } from "zod"

import type { CanvasSnapshot } from "@/types/canvas"

const DEFAULT_MODEL = "gemini-3.5-flash"
// Specs are longer-form than a design plan and run with high thinking, so allow
// more time than design generation before failing fast on a provider stall.
const SPEC_GENERATION_TIMEOUT_MS = 120_000

// Upper bounds on spec-generation input. The prompt is assembled from
// client-supplied chat and canvas data, so each dimension is capped to keep the
// prompt size (and token spend) bounded against attacker-controlled expansion.
// Limits are generous relative to real design sessions and are never reached by
// legitimate input.
const MAX_CHAT_MESSAGE_LENGTH = 10_000
const MAX_CHAT_HISTORY_LENGTH = 500
const MAX_CANVAS_NODES = 1_000
const MAX_CANVAS_EDGES = 2_000

/**
 * A single chat message forwarded as spec-generation context. Mirrors the
 * `ai-chat` feed payload but only requires what the spec needs (role + content);
 * extra feed fields like `timestamp` are ignored by the default object strip.
 * `content` may be empty — empty messages are filtered when building the prompt.
 */
const specChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(MAX_CHAT_MESSAGE_LENGTH),
  sender: z.string().optional(),
})

type SpecChatMessage = z.infer<typeof specChatMessageSchema>

/**
 * Zod contract for the `generate-spec` task input. The canvas `nodes`/`edges`
 * are validated and normalized separately by the shared `parseCanvasSnapshot`
 * (the existing canvas model), so they are only checked here as arrays.
 */
const generateSpecInputSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  chatHistory: z.array(specChatMessageSchema).max(MAX_CHAT_HISTORY_LENGTH),
  nodes: z.array(z.unknown()).max(MAX_CANVAS_NODES),
  edges: z.array(z.unknown()).max(MAX_CANVAS_EDGES),
})

type GenerateSpecInput = z.infer<typeof generateSpecInputSchema>

class SpecGenerationTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Spec generation timed out after ${timeoutMs / 1000} seconds.`)
    this.name = "SpecGenerationTimeoutError"
  }
}

class SpecGenerationEmptyOutputError extends Error {
  constructor() {
    super("Gemini returned an empty technical specification.")
    this.name = "SpecGenerationEmptyOutputError"
  }
}

const SYSTEM_PROMPT = `You are Archai's technical specification writer. You convert a collaborative system-design canvas and the team's discussion into a clear, well-structured Markdown technical specification.

HOW TO READ THE INPUT:
- Canvas components are nodes. Each node's shape hints at the kind of component:
  - rectangle: a general-purpose component
  - pill: a service or process
  - cylinder: a database or data store
  - hexagon: an external system or boundary
  - diamond: a decision point or gateway
  - circle: an event or endpoint
- Connections are directed edges between components. An edge label names the relationship, protocol, or data that flows along it.
- The conversation is the team's discussion of the system. Use it to capture intent, requirements, and decisions that the diagram alone does not convey.

WHAT TO WRITE:
- Output a single Markdown technical specification and nothing else. No surrounding code fences, no preamble, and no closing commentary.
- Begin with a level-one heading ("# ") naming the system.
- Organize the document into clear sections. Good defaults: Overview, Components, Data Flow, and — when the inputs support them — Requirements, Key Decisions, and Considerations.
- Describe each component's responsibility and each meaningful relationship between components.
- Use professional, concise technical-writing prose with Markdown headings, lists, and tables where they add clarity.

RULES:
- Ground every statement in the provided components, connections, and conversation. Do not invent components or connections that are not present.
- When the inputs are sparse, write a shorter, accurate specification instead of padding it with fabricated detail.
- Refer to components by their labels.`

function requireGoogleApiKey(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error(
      "GOOGLE_AI_API_KEY is required for spec generation to read the canvas."
    )
  }

  return apiKey
}

// Reuses the same Gemini model selection as design generation (shared
// GOOGLE_AI_MODEL override, Gemini 3 required) without introducing a shared AI
// provider abstraction.
function getSpecModelId(): string {
  const modelId = process.env.GOOGLE_AI_MODEL ?? DEFAULT_MODEL

  if (!/^gemini-3[.-]/.test(modelId)) {
    throw new Error(
      `Unsupported Google AI model "${modelId}". Spec generation requires a Gemini 3 model id such as "${DEFAULT_MODEL}".`
    )
  }

  return modelId
}

function getSpecProviderOptions(modelId: string): {
  google: GoogleLanguageModelOptions
} {
  const googleOptions: GoogleLanguageModelOptions = {}

  if (/^gemini-3[.-]/.test(modelId)) {
    googleOptions.thinkingConfig = { thinkingLevel: "high" }
  }

  return { google: googleOptions }
}

function getNodeLabel(label: string): string {
  const trimmed = label.trim()

  return trimmed.length > 0 ? trimmed : "Untitled"
}

function describeCanvas(snapshot: CanvasSnapshot): string {
  if (snapshot.nodes.length === 0 && snapshot.edges.length === 0) {
    return "Canvas: the canvas is currently empty."
  }

  const labelById = new Map(
    snapshot.nodes.map((node) => [node.id, getNodeLabel(node.data.label)])
  )

  const nodeLines = snapshot.nodes
    .map(
      (node) =>
        `- ${getNodeLabel(node.data.label)} (${node.data.shape}, color group: ${node.data.color})`
    )
    .join("\n")

  const edgeLines = snapshot.edges
    .map((edge) => {
      const source = labelById.get(edge.source) ?? edge.source
      const target = labelById.get(edge.target) ?? edge.target
      const label = edge.data?.label?.trim()

      return `- ${source} → ${target}${label ? `: ${label}` : ""}`
    })
    .join("\n")

  return `Canvas components:\n${nodeLines || "- none"}\n\nCanvas connections:\n${
    edgeLines || "- none"
  }`
}

function describeChatHistory(chatHistory: SpecChatMessage[]): string {
  const lines = chatHistory
    .map((message) => {
      const content = message.content.trim()

      if (content.length === 0) {
        return null
      }

      const speaker =
        message.role === "assistant"
          ? "Archai"
          : message.sender?.trim() || "User"

      return `- ${speaker} (${message.role}): ${content}`
    })
    .filter((line): line is string => line !== null)

  if (lines.length === 0) {
    return "Conversation: no discussion was provided."
  }

  return `Conversation:\n${lines.join("\n")}`
}

function buildUserPrompt(
  snapshot: CanvasSnapshot,
  chatHistory: SpecChatMessage[]
): string {
  return `${describeCanvas(snapshot)}\n\n${describeChatHistory(
    chatHistory
  )}\n\nWrite the Markdown technical specification for this system.`
}

// Defensive: the system prompt forbids wrapping the document, but strip an outer
// ```markdown fence if the model adds one so the output stays plain Markdown.
function stripOuterCodeFence(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed)

  return fenceMatch ? fenceMatch[1].trim() : trimmed
}

/**
 * Generates a Markdown technical specification from the canvas graph and chat
 * context with Gemini. Bounded by an AbortController timeout so a provider stall
 * fails fast. Returns plain Markdown; throws on a timeout or empty output.
 */
async function generateSpecMarkdown(
  snapshot: CanvasSnapshot,
  chatHistory: SpecChatMessage[]
): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: requireGoogleApiKey() })
  const modelId = getSpecModelId()
  const model = google(modelId)
  const abortController = new AbortController()
  const timeout = setTimeout(() => {
    abortController.abort(
      new SpecGenerationTimeoutError(SPEC_GENERATION_TIMEOUT_MS)
    )
  }, SPEC_GENERATION_TIMEOUT_MS)

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(snapshot, chatHistory),
      temperature: 0.4,
      providerOptions: getSpecProviderOptions(modelId),
      abortSignal: abortController.signal,
    })

    const markdown = stripOuterCodeFence(text)

    if (markdown.length === 0) {
      throw new SpecGenerationEmptyOutputError()
    }

    return markdown
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new SpecGenerationTimeoutError(SPEC_GENERATION_TIMEOUT_MS)
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export {
  generateSpecInputSchema,
  generateSpecMarkdown,
  type GenerateSpecInput,
  type SpecChatMessage,
}
