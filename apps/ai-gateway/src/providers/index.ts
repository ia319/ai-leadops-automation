import { AppError } from "../errors.js";
import { MockProvider } from "./mock.js";
import type { AIProvider, AIProviderConfig } from "./types.js";

export function createAIProvider(config: AIProviderConfig): AIProvider {
  if (config.provider === "mock") {
    return new MockProvider(config);
  }

  throw new AppError("AI_PROVIDER_FAILED", `Unsupported AI provider: ${config.provider}`, 500);
}
