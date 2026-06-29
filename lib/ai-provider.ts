import {
  createAnthropic,
  type AnthropicLanguageModelOptions,
} from "@ai-sdk/anthropic"

const DEFAULT_AI_MODEL = "claude-opus-4-7"
const AI_MODEL_LABEL = "Claude Opus 4.7"
const AI_MAX_OUTPUT_TOKENS = 64_000
const AI_PROVIDER_OPTIONS = {
  anthropic: {
    effort: "max",
    structuredOutputMode: "auto",
  },
} satisfies { anthropic: AnthropicLanguageModelOptions }

function getAIModelId(): string {
  const configuredModel = process.env.ANTHROPIC_AI_MODEL?.trim()

  return configuredModel && configuredModel.length > 0
    ? configuredModel
    : DEFAULT_AI_MODEL
}

function getAIModelLabel(): string {
  const modelId = getAIModelId()

  return modelId === DEFAULT_AI_MODEL ? AI_MODEL_LABEL : modelId
}

function requireAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()

  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error("ANTHROPIC_API_KEY is required for Archai AI generation.")
  }

  return apiKey
}

function createAIModel(modelId = getAIModelId()) {
  const anthropic = createAnthropic({ apiKey: requireAnthropicApiKey() })

  return anthropic(modelId)
}

function getAIProviderOptions() {
  return AI_PROVIDER_OPTIONS
}

export {
  AI_MAX_OUTPUT_TOKENS,
  DEFAULT_AI_MODEL,
  createAIModel,
  getAIModelId,
  getAIModelLabel,
  getAIProviderOptions,
}
