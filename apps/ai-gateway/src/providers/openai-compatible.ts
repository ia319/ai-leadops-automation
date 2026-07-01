import {
  buildLeadQualificationUserPayload,
  getLeadQualificationSystemPrompt,
} from "../prompts/lead-qualification.js";
import { AppError } from "../errors.js";
import type { NormalizedLead } from "../types.js";
import { parseJsonObject } from "../utils/json-parser.js";
import { withRetry } from "../utils/retry.js";
import {
  getAIQualificationOutputJsonSchema,
  validateAIQualificationOutput,
} from "../validation/json-schema-validator.js";
import { requireProviderValue, toProviderAppError } from "./shared.js";
import type {
  AIProvider,
  AIProviderConfig,
  AIProviderResult,
} from "./types.js";

type Fetch = typeof fetch;

interface ChatCompletionResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: {
      readonly content?: string | null;
    };
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
}

class ProviderHttpError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly type: string | undefined;

  constructor(status: number, message: string, code?: string, type?: string) {
    super(message);
    this.name = "ProviderHttpError";
    this.status = status;
    this.code = code;
    this.type = type;
  }
}

export class OpenAICompatibleProvider implements AIProvider {
  private readonly config: AIProviderConfig;
  private readonly endpoint: string;
  private readonly fetchClient: Fetch;

  constructor(config: AIProviderConfig, fetchClient: Fetch = fetch) {
    this.config = config;
    this.endpoint = buildChatCompletionsEndpoint(
      requireProviderValue(
        config.baseUrl,
        "OPENAI_COMPATIBLE_BASE_URL",
        "openai-compatible",
      ),
    );
    this.fetchClient = fetchClient;
  }

  async qualifyLead(input: NormalizedLead): Promise<AIProviderResult> {
    try {
      const response = await withRetry(() => this.createChatCompletion(input), {
        attempts: this.config.retryCount,
        shouldRetry: shouldRetryProviderError,
      });
      const content = response.choices?.[0]?.message?.content ?? "";
      const output = validateAIQualificationOutput(parseJsonObject(content));

      return {
        output,
        usage: {
          input_tokens: response.usage?.prompt_tokens ?? 0,
          output_tokens: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      throw toProviderAppError("openai-compatible", error);
    }
  }

  private async createChatCompletion(
    input: NormalizedLead,
  ): Promise<ChatCompletionResponse> {
    const apiKey = requireProviderValue(
      this.config.apiKey,
      "OPENAI_COMPATIBLE_API_KEY",
      "openai-compatible",
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.config.timeoutMs);

    try {
      const response = await this.fetchClient(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          messages: [
            {
              role: "system",
              content: buildCompatibleSystemPrompt(),
            },
            {
              role: "user",
              content: buildLeadQualificationUserPayload(input),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await buildHttpError(response);
      }

      return (await response.json()) as ChatCompletionResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildCompatibleSystemPrompt(): string {
  return [
    getLeadQualificationSystemPrompt(),
    "",
    "Output JSON Schema:",
    JSON.stringify(getAIQualificationOutputJsonSchema()),
  ].join("\n");
}

function buildChatCompletionsEndpoint(baseUrl: string): string {
  try {
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL("chat/completions", normalizedBaseUrl).toString();
  } catch {
    throw new AppError(
      "AI_PROVIDER_FAILED",
      "OPENAI_COMPATIBLE_BASE_URL must be a valid URL",
      500,
    );
  }
}

async function buildHttpError(response: Response): Promise<ProviderHttpError> {
  const body = await readJsonResponse(response);
  const error = isRecord(body.error) ? body.error : body;
  const code = readString(error, "code");
  const type = readString(error, "type");
  const message =
    readString(error, "message") ??
    `OpenAI-compatible provider returned HTTP ${response.status}`;

  return new ProviderHttpError(response.status, message, code, type);
}

async function readJsonResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  try {
    const body = (await response.json()) as unknown;
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

function shouldRetryProviderError(error: unknown): boolean {
  if (error instanceof ProviderHttpError) {
    if (error.status === 429 && error.code === "insufficient_quota") {
      return false;
    }

    return new Set([408, 429, 500, 502, 503, 504]).has(error.status);
  }

  return error instanceof TypeError || isAbortError(error);
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

function readString(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
