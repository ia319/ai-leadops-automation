import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AppError } from "../errors.js";
import type { NormalizedLead } from "../types.js";

const promptDir = findPromptDir(dirname(fileURLToPath(import.meta.url)));
const leadQualificationSystemPrompt = readFileSync(
  resolve(promptDir, "lead-qualification.prompt.md"),
  "utf8",
);

/**
 * Build the system prompt shared by all provider adapters.
 *
 * @returns The lead qualification system prompt.
 */
export function getLeadQualificationSystemPrompt(): string {
  return leadQualificationSystemPrompt;
}

/**
 * Build the user payload that providers classify.
 *
 * @param lead Normalized lead from the gateway request.
 * @returns A stable JSON string for the model input.
 */
export function buildLeadQualificationUserPayload(
  lead: NormalizedLead,
): string {
  return JSON.stringify(
    {
      lead,
    },
    null,
    2,
  );
}

function findPromptDir(startDir: string): string {
  const candidates = [
    resolve(startDir, "../../../..", "prompts"),
    resolve(startDir, "../../../../..", "prompts"),
    resolve(process.cwd(), "prompts"),
    resolve(process.cwd(), "../..", "prompts"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new AppError(
    "AI_GATEWAY_FAILED",
    "Runtime prompt directory was not found",
    500,
  );
}
