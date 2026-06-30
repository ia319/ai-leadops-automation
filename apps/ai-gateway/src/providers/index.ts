import { AppError } from "../errors.js";
import { AnthropicProvider } from "./anthropic.js";
import { MockProvider } from "./mock.js";
import { OpenAIProvider } from "./openai.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import type { AIProvider, AIProviderConfig } from "./types.js";

export function createAIProvider(config: AIProviderConfig): AIProvider {
  if (config.provider === "mock") {
    return new MockProvider(config);
  }

  if (config.provider === "openai") {
    return new OpenAIProvider(config);
  }

  if (config.provider === "anthropic") {
    return new AnthropicProvider(config);
  }

  if (config.provider === "openai-compatible") {
    return new OpenAICompatibleProvider(config);
  }

  throw new AppError(
    "AI_PROVIDER_FAILED",
    `Unsupported AI provider: ${config.provider}`,
    500,
  );
}
