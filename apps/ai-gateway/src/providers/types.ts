import type {
  AIQualificationOutput,
  NormalizedLead,
  TokenUsage,
} from "../types.js";

export interface AIProvider {
  qualifyLead(input: NormalizedLead): Promise<AIProviderResult>;
}

export interface AIProviderResult {
  readonly output: AIQualificationOutput;
  readonly usage: TokenUsage;
}

export interface AIProviderConfig {
  readonly provider: string;
  readonly model: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly timeoutMs: number;
  readonly retryCount: number;
}
