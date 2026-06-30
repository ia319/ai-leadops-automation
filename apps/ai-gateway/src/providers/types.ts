import type { AIQualificationOutput, NormalizedLead } from "../types.js";

export interface AIProvider {
  qualifyLead(input: NormalizedLead): Promise<AIQualificationOutput>;
}

export interface AIProviderConfig {
  readonly provider: string;
  readonly model: string;
}
