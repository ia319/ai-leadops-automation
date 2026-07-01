import Anthropic from "@anthropic-ai/sdk";

import {
  buildLeadQualificationUserPayload,
  getLeadQualificationSystemPrompt,
} from "../prompts/lead-qualification.js";
import type { NormalizedLead } from "../types.js";
import { parseJsonObject } from "../utils/json-parser.js";
import {
  getAIQualificationStructuredOutputJsonSchema,
  validateAIQualificationOutput,
} from "../validation/json-schema-validator.js";
import {
  requireProviderValue,
  sdkMaxRetries,
  toProviderAppError,
} from "./shared.js";
import type {
  AIProvider,
  AIProviderConfig,
  AIProviderResult,
} from "./types.js";

interface AnthropicMessagesClient {
  readonly messages: {
    create(params: AnthropicMessageCreateParams): Promise<AnthropicMessage>;
  };
}

interface AnthropicMessageCreateParams {
  readonly model: string;
  readonly max_tokens: number;
  readonly system: string;
  readonly messages: ReadonlyArray<{
    readonly role: "user";
    readonly content: string;
  }>;
  readonly output_config: {
    readonly format: {
      readonly type: "json_schema";
      readonly schema: Record<string, unknown>;
    };
  };
}

interface AnthropicMessage {
  readonly content: ReadonlyArray<{
    readonly type: string;
    readonly text?: string;
  }>;
  readonly usage?: {
    readonly input_tokens: number;
    readonly output_tokens: number;
  } | null;
}

export class AnthropicProvider implements AIProvider {
  private readonly config: AIProviderConfig;
  private readonly client: AnthropicMessagesClient;

  constructor(config: AIProviderConfig, client?: AnthropicMessagesClient) {
    this.config = config;
    this.client =
      client ??
      (new Anthropic({
        apiKey: requireProviderValue(
          config.apiKey,
          "ANTHROPIC_API_KEY",
          "anthropic",
        ),
        timeout: config.timeoutMs,
        maxRetries: sdkMaxRetries(config.retryCount),
      }) as unknown as AnthropicMessagesClient);
  }

  async qualifyLead(input: NormalizedLead): Promise<AIProviderResult> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: getLeadQualificationSystemPrompt(),
        messages: [
          {
            role: "user",
            content: buildLeadQualificationUserPayload(input),
          },
        ],
        output_config: {
          format: {
            type: "json_schema",
            schema: getAIQualificationStructuredOutputJsonSchema(),
          },
        },
      });

      const output = validateAIQualificationOutput(
        parseJsonObject(readFirstTextBlock(message)),
      );

      return {
        output,
        usage: {
          input_tokens: message.usage?.input_tokens ?? 0,
          output_tokens: message.usage?.output_tokens ?? 0,
        },
      };
    } catch (error) {
      throw toProviderAppError("anthropic", error);
    }
  }
}

function readFirstTextBlock(message: AnthropicMessage): string {
  const textBlock = message.content.find(
    (block) => block.type === "text" && typeof block.text === "string",
  );

  return textBlock?.text ?? "";
}
