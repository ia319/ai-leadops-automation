import { AppError } from "../errors.js";

export function requireProviderValue(
  value: string | undefined,
  name: string,
  provider: string,
): string {
  if (value === undefined || value.trim() === "") {
    throw new AppError(
      "AI_PROVIDER_FAILED",
      `${name} is required for ${provider} provider`,
      500,
    );
  }

  return value;
}

export function toProviderAppError(provider: string, error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError(
    "AI_PROVIDER_FAILED",
    `${provider} provider request failed`,
    502,
    {
      provider,
      ...extractSafeErrorDetails(error),
    },
  );
}

export function sdkMaxRetries(retryCount: number): number {
  return Math.max(0, retryCount - 1);
}

function extractSafeErrorDetails(error: unknown): Record<string, unknown> {
  if (!isRecord(error)) {
    return {
      message: String(error),
    };
  }

  return {
    ...copySafeProperty(error, "status"),
    ...copySafeProperty(error, "statusCode"),
    ...copySafeProperty(error, "code"),
    ...copySafeProperty(error, "type"),
    ...copySafeProperty(error, "message"),
  };
}

function copySafeProperty(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = source[key];
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return {
      [key]: value,
    };
  }

  return {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
