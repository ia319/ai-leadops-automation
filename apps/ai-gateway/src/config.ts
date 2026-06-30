import "dotenv/config";

import { AppError } from "./errors.js";

export type AIProviderName =
  | "mock"
  | "openai"
  | "anthropic"
  | "openai-compatible";

export interface AppConfig {
  readonly port: number;
  readonly logLevel: string;
  readonly aiProvider: AIProviderName;
  readonly aiModel: string;
  readonly aiTemperature: number;
  readonly aiMaxTokens: number;
  readonly aiTimeoutMs: number;
  readonly aiRetryCount: number;
  readonly aiApiKey?: string;
  readonly aiBaseUrl?: string;
}

const supportedProviders = new Set<string>([
  "mock",
  "openai",
  "anthropic",
  "openai-compatible",
]);

/**
 * Load runtime configuration for the gateway and selected provider.
 *
 * @param env Environment variable source.
 * @returns Parsed application configuration.
 * @throws AppError when a required configuration value is invalid.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number.parseInt(env.PORT ?? "8787", 10);
  const provider = env.AI_PROVIDER ?? "mock";
  const aiTemperature = parseNumber(env.AI_TEMPERATURE ?? "0.2", {
    name: "AI_TEMPERATURE",
    min: 0,
    max: 2,
  });
  const aiMaxTokens = parseInteger(env.AI_MAX_TOKENS ?? "1200", {
    name: "AI_MAX_TOKENS",
    min: 1,
  });
  const aiTimeoutMs = parseInteger(env.AI_TIMEOUT_MS ?? "30000", {
    name: "AI_TIMEOUT_MS",
    min: 1000,
  });
  const aiRetryCount = parseInteger(env.AI_RETRY_COUNT ?? "2", {
    name: "AI_RETRY_COUNT",
    min: 1,
  });

  if (!Number.isInteger(port) || port <= 0) {
    throw new AppError("INVALID_INPUT", "PORT must be a positive integer", 500);
  }

  if (!isAIProviderName(provider)) {
    throw new AppError(
      "AI_PROVIDER_FAILED",
      `Unsupported AI provider: ${provider}`,
      500,
    );
  }

  const providerSettings = loadProviderSettings(provider, env);

  return {
    port,
    logLevel: env.LOG_LEVEL ?? "info",
    aiProvider: provider,
    aiModel: providerSettings.model,
    aiTemperature,
    aiMaxTokens,
    aiTimeoutMs,
    aiRetryCount,
    ...optionalString("aiApiKey", providerSettings.apiKey),
    ...optionalString("aiBaseUrl", providerSettings.baseUrl),
  };
}

function isAIProviderName(value: string): value is AIProviderName {
  return supportedProviders.has(value);
}

function loadProviderSettings(
  provider: AIProviderName,
  env: NodeJS.ProcessEnv,
): {
  readonly model: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
} {
  if (provider === "mock") {
    return {
      model: env.AI_MODEL ?? "demo-leadops-model",
    };
  }

  if (provider === "openai") {
    return {
      model: requireSetting(env.OPENAI_MODEL, "OPENAI_MODEL"),
      apiKey: requireSetting(env.OPENAI_API_KEY, "OPENAI_API_KEY"),
    };
  }

  if (provider === "anthropic") {
    return {
      model: requireSetting(env.ANTHROPIC_MODEL, "ANTHROPIC_MODEL"),
      apiKey: requireSetting(env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"),
    };
  }

  return {
    model: requireSetting(
      env.OPENAI_COMPATIBLE_MODEL,
      "OPENAI_COMPATIBLE_MODEL",
    ),
    apiKey: requireSetting(
      env.OPENAI_COMPATIBLE_API_KEY,
      "OPENAI_COMPATIBLE_API_KEY",
    ),
    baseUrl: requireSetting(
      env.OPENAI_COMPATIBLE_BASE_URL,
      "OPENAI_COMPATIBLE_BASE_URL",
    ),
  };
}

function parseInteger(
  value: string,
  options: {
    readonly name: string;
    readonly min: number;
  },
): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < options.min) {
    throw new AppError(
      "INVALID_INPUT",
      `${options.name} must be an integer greater than or equal to ${options.min}`,
      500,
    );
  }

  return parsed;
}

function parseNumber(
  value: string,
  options: {
    readonly name: string;
    readonly min: number;
    readonly max: number;
  },
): number {
  const parsed = Number.parseFloat(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < options.min ||
    parsed > options.max
  ) {
    throw new AppError(
      "INVALID_INPUT",
      `${options.name} must be between ${options.min} and ${options.max}`,
      500,
    );
  }

  return parsed;
}

function requireSetting(value: string | undefined, name: string): string {
  if (value === undefined || value.trim() === "") {
    throw new AppError(
      "AI_PROVIDER_FAILED",
      `${name} is required for the selected AI provider`,
      500,
    );
  }

  return value;
}

function optionalString<Key extends string>(
  key: Key,
  value: string | undefined,
): Partial<Record<Key, string>> {
  return value === undefined ? {} : ({ [key]: value } as Record<Key, string>);
}
