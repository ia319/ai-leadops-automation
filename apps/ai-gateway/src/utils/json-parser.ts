import { AppError } from "../errors.js";

type JsonObject = Record<string, unknown>;

/**
 * Parse an AI provider payload into a JSON object.
 *
 * @param value Provider output as an object or text.
 * @returns Parsed JSON object.
 * @throws AppError when no JSON object can be parsed.
 */
export function parseJsonObject(value: unknown): JsonObject {
  if (isJsonObject(value)) {
    return value;
  }

  if (typeof value !== "string") {
    throwParseError("AI output was not a JSON object or string");
  }

  const candidates = buildJsonCandidates(value);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (isJsonObject(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  throwParseError("AI output did not contain a valid JSON object");
}

function buildJsonCandidates(value: string): readonly string[] {
  const trimmed = value.trim();
  const candidates = [trimmed];
  const fenced = extractFencedJson(trimmed);
  const balanced = extractFirstBalancedObject(trimmed);

  if (fenced !== null) {
    candidates.push(fenced);
  }

  if (balanced !== null) {
    candidates.push(balanced);
  }

  return candidates;
}

function extractFencedJson(value: string): string | null {
  const match = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(value);
  return match?.[1]?.trim() ?? null;
}

function extractFirstBalancedObject(value: string): string | null {
  const start = value.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(start, index + 1);
      }
    }
  }

  return null;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function throwParseError(message: string): never {
  throw new AppError("AI_PARSE_FAILED", message, 502);
}
