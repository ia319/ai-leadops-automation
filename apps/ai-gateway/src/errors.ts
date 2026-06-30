export type ApiErrorCode =
  | "INVALID_INPUT"
  | "MISSING_CONTACT_METHOD"
  | "MISSING_MESSAGE_CONTENT"
  | "UNSUPPORTED_SOURCE"
  | "AI_GATEWAY_FAILED"
  | "AI_PROVIDER_FAILED"
  | "AI_PARSE_FAILED"
  | "AI_SCHEMA_VALIDATION_FAILED"
  | "CRM_WRITE_FAILED"
  | "SLACK_NOTIFY_FAILED"
  | "GMAIL_DRAFT_FAILED"
  | "UNKNOWN_ERROR";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function buildErrorResponse(error: AppError): {
  status: "error";
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
} {
  return {
    status: "error",
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
}
