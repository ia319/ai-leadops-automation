import "dotenv/config";

import { AppError } from "./errors.js";

export type AIProviderName = "mock";

export interface AppConfig {
  readonly port: number;
  readonly logLevel: string;
  readonly aiProvider: AIProviderName;
  readonly aiModel: string;
}

const supportedProviders = new Set<string>(["mock"]);

/**
 * Load the minimal runtime configuration required for the mock gateway.
 *
 * @param env Environment variable source.
 * @returns Parsed application configuration.
 * @throws AppError when a required configuration value is invalid.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number.parseInt(env.PORT ?? "8787", 10);
  const provider = env.AI_PROVIDER ?? "mock";

  if (!Number.isInteger(port) || port <= 0) {
    throw new AppError("INVALID_INPUT", "PORT must be a positive integer", 500);
  }

  if (provider !== "mock" || !supportedProviders.has(provider)) {
    throw new AppError("AI_PROVIDER_FAILED", `Unsupported AI provider: ${provider}`, 500);
  }

  return {
    port,
    logLevel: env.LOG_LEVEL ?? "info",
    aiProvider: provider,
    aiModel: env.AI_MODEL ?? "demo-leadops-model"
  };
}
