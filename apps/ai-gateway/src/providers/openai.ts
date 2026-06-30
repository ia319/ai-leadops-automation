import OpenAI from "openai";

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

interface OpenAIResponsesClient {
  readonly responses: {
    create(params: OpenAIResponseCreateParams): Promise<OpenAIResponse>;
  };
}

interface OpenAIResponseCreateParams {
  readonly model: string;
  readonly instructions: string;
  readonly input: string;
  readonly max_output_tokens: number;
  readonly store: boolean;
  readonly temperature: number;
  readonly text: {
    readonly format: {
      readonly type: "json_schema";
      readonly name: string;
      readonly description: string;
      readonly schema: Record<string, unknown>;
      readonly strict: boolean;
    };
  };
}

interface OpenAIResponse {
  readonly output_text: string;
  readonly usage?: {
    readonly input_tokens: number;
    readonly output_tokens: number;
  } | null;
}

export class OpenAIProvider implements AIProvider {
  private readonly config: AIProviderConfig;
  private readonly client: OpenAIResponsesClient;

  constructor(config: AIProviderConfig, client?: OpenAIResponsesClient) {
    this.config = config;
    this.client =
      client ??
      (new OpenAI({
        apiKey: requireProviderValue(config.apiKey, "OPENAI_API_KEY", "openai"),
        timeout: config.timeoutMs,
        maxRetries: sdkMaxRetries(config.retryCount),
      }) as unknown as OpenAIResponsesClient);
  }

  async qualifyLead(input: NormalizedLead): Promise<AIProviderResult> {
    try {
      const response = await this.client.responses.create({
        model: this.config.model,
        instructions: getLeadQualificationSystemPrompt(),
        input: buildLeadQualificationUserPayload(input),
        max_output_tokens: this.config.maxTokens,
        store: false,
        temperature: this.config.temperature,
        text: {
          format: {
            type: "json_schema",
            name: "lead_qualification",
            description: "Lead qualification output for AI LeadOps automation.",
            schema: getAIQualificationStructuredOutputJsonSchema(),
            strict: true,
          },
        },
      });

      const output = validateAIQualificationOutput(
        parseJsonObject(response.output_text),
      );

      return {
        output,
        usage: {
          input_tokens: response.usage?.input_tokens ?? 0,
          output_tokens: response.usage?.output_tokens ?? 0,
        },
      };
    } catch (error) {
      throw toProviderAppError("openai", error);
    }
  }
}
