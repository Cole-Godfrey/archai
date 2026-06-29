import {
  createOpenAI,
  type OpenAILanguageModelResponsesOptions,
} from "@ai-sdk/openai"

const DEFAULT_AI_MODEL = "gpt-5.5"
const AI_MODEL_LABEL = "GPT-5.5 Medium"
const AI_MAX_OUTPUT_TOKENS = 64_000
const AI_PROVIDER_OPTIONS = {
  openai: {
    reasoningEffort: "medium",
    store: false,
  },
} satisfies { openai: OpenAILanguageModelResponsesOptions }

function getAIModelId(): string {
  const configuredModel = process.env.OPENAI_AI_MODEL?.trim()

  return configuredModel && configuredModel.length > 0
    ? configuredModel
    : DEFAULT_AI_MODEL
}

function getAIModelLabel(): string {
  const modelId = getAIModelId()

  return modelId === DEFAULT_AI_MODEL ? AI_MODEL_LABEL : modelId
}

function requireOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error("OPENAI_API_KEY is required for Archai AI generation.")
  }

  return apiKey
}

function createAIModel(modelId = getAIModelId()) {
  const openai = createOpenAI({ apiKey: requireOpenAIApiKey() })

  return openai.responses(modelId)
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
