import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AnySchema, ErrorObject, Options, ValidateFunction } from "ajv";

import { AppError, type ApiErrorCode } from "../errors.js";
import type {
  AIQualificationOutput,
  ApiErrorResponse,
  CrmRecord,
  NormalizedLead,
  QualifyLeadRequest,
} from "../types.js";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020") as AjvConstructor;
const addFormats = require("ajv-formats") as (ajv: AjvInstance) => AjvInstance;

type RuntimeSchemaName =
  | "ai-qualification-output.schema.json"
  | "api-error.schema.json"
  | "crm-record.schema.json"
  | "normalized-lead.schema.json"
  | "qualify-lead-request.schema.json";

type RuntimeValidator<T> = {
  readonly validate: ValidateFunction<T>;
  readonly failure: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly statusCode: number;
  };
};

interface AjvInstance {
  addSchema(schema: AnySchema): AjvInstance;
  compile<T>(schema: AnySchema): ValidateFunction<T>;
}

interface AjvConstructor {
  new (options?: Options): AjvInstance;
}

const schemaDir = findSchemaDir(dirname(fileURLToPath(import.meta.url)));
const ajv = addFormats(
  new Ajv2020({
    allErrors: true,
  }),
);

const normalizedLeadSchema = loadSchema("normalized-lead.schema.json");
const qualifyLeadRequestSchema = loadSchema("qualify-lead-request.schema.json");
const aiQualificationOutputSchema = loadSchema(
  "ai-qualification-output.schema.json",
);
const crmRecordSchema = loadSchema("crm-record.schema.json");
const apiErrorSchema = loadSchema("api-error.schema.json");

ajv.addSchema(normalizedLeadSchema);

const validateQualifyLeadRequestSchema = ajv.compile<QualifyLeadRequest>(
  qualifyLeadRequestSchema,
);
const validateNormalizedLeadSchema =
  ajv.compile<NormalizedLead>(normalizedLeadSchema);
const validateAIQualificationOutputSchema = ajv.compile<AIQualificationOutput>(
  aiQualificationOutputSchema,
);
const validateCrmRecordSchema = ajv.compile<CrmRecord>(crmRecordSchema);
const validateApiErrorResponseSchema =
  ajv.compile<ApiErrorResponse>(apiErrorSchema);

/**
 * Return the AI output JSON Schema used by provider structured outputs.
 *
 * @returns A copy of the AI qualification output JSON Schema.
 */
export function getAIQualificationOutputJsonSchema(): Record<string, unknown> {
  return structuredClone(aiQualificationOutputSchema) as Record<
    string,
    unknown
  >;
}

/**
 * Return the provider-safe JSON Schema subset used by structured-output APIs.
 *
 * @returns A JSON Schema derived from the source contract.
 */
export function getAIQualificationStructuredOutputJsonSchema(): Record<
  string,
  unknown
> {
  return stripProviderUnsupportedKeywords(
    aiQualificationOutputSchema,
  ) as Record<string, unknown>;
}

/**
 * Validate the external qualification request before provider execution.
 *
 * @param value Unknown request body from Fastify.
 * @returns A typed qualification request.
 * @throws AppError when the request does not match the JSON Schema contract.
 */
export function validateQualifyLeadRequest(value: unknown): QualifyLeadRequest {
  return validateWithSchema(value, {
    validate: validateQualifyLeadRequestSchema,
    failure: {
      code: "INVALID_INPUT",
      message: "Request body failed validation",
      statusCode: 400,
    },
  });
}

/**
 * Validate a normalized lead before it is passed across provider boundaries.
 *
 * @param value Unknown lead value.
 * @returns A typed normalized lead.
 * @throws AppError when the lead does not match the JSON Schema contract.
 */
export function validateNormalizedLead(value: unknown): NormalizedLead {
  return validateWithSchema(value, {
    validate: validateNormalizedLeadSchema,
    failure: {
      code: "INVALID_INPUT",
      message: "Normalized lead failed validation",
      statusCode: 400,
    },
  });
}

/**
 * Validate AI provider output before downstream workflows consume it.
 *
 * @param value Unknown AI output value.
 * @returns A typed AI qualification output.
 * @throws AppError when provider output does not match the JSON Schema contract.
 */
export function validateAIQualificationOutput(
  value: unknown,
): AIQualificationOutput {
  return validateWithSchema(value, {
    validate: validateAIQualificationOutputSchema,
    failure: {
      code: "AI_SCHEMA_VALIDATION_FAILED",
      message: "AI output failed validation",
      statusCode: 502,
    },
  });
}

/**
 * Validate CRM records before writing them to a downstream system.
 *
 * @param value Unknown CRM record value.
 * @returns A typed CRM record.
 * @throws AppError when the CRM record does not match the JSON Schema contract.
 */
export function validateCrmRecord(value: unknown): CrmRecord {
  return validateWithSchema(value, {
    validate: validateCrmRecordSchema,
    failure: {
      code: "AI_GATEWAY_FAILED",
      message: "CRM record failed validation",
      statusCode: 500,
    },
  });
}

/**
 * Validate API error responses before exposing them in tests or adapters.
 *
 * @param value Unknown API error response value.
 * @returns A typed API error response.
 * @throws AppError when the response does not match the JSON Schema contract.
 */
export function validateApiErrorResponse(value: unknown): ApiErrorResponse {
  return validateWithSchema(value, {
    validate: validateApiErrorResponseSchema,
    failure: {
      code: "AI_GATEWAY_FAILED",
      message: "API error response failed validation",
      statusCode: 500,
    },
  });
}

function validateWithSchema<T>(
  value: unknown,
  validator: RuntimeValidator<T>,
): T {
  if (validator.validate(value)) {
    return value;
  }

  throw new AppError(
    validator.failure.code,
    validator.failure.message,
    validator.failure.statusCode,
    buildValidationDetails(validator.validate.errors),
  );
}

function buildValidationDetails(
  errors: readonly ErrorObject[] | null | undefined,
): {
  readonly issues: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
    readonly keyword: string;
    readonly schemaPath: string;
    readonly params: Record<string, unknown>;
  }>;
} {
  return {
    issues: (errors ?? []).map((error) => ({
      path: error.instancePath || "/",
      message: error.message ?? "failed validation",
      keyword: error.keyword,
      schemaPath: error.schemaPath,
      params: error.params,
    })),
  };
}

function loadSchema(name: RuntimeSchemaName): object {
  return JSON.parse(readFileSync(resolve(schemaDir, name), "utf8")) as object;
}

function stripProviderUnsupportedKeywords(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripProviderUnsupportedKeywords(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  const stripped: Record<string, unknown> = {};

  for (const [key, propertyValue] of Object.entries(value)) {
    if (providerUnsupportedKeywords.has(key)) {
      continue;
    }

    stripped[key] = stripProviderUnsupportedKeywords(propertyValue);
  }

  return stripped;
}

const providerUnsupportedKeywords = new Set([
  "$id",
  "$schema",
  "format",
  "maxItems",
  "maxLength",
  "maxProperties",
  "maximum",
  "minItems",
  "minLength",
  "minProperties",
  "minimum",
  "multipleOf",
  "pattern",
  "uniqueItems",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findSchemaDir(startDir: string): string {
  const candidates = [
    resolve(startDir, "../../../..", "schemas"),
    resolve(startDir, "../../../../..", "schemas"),
    resolve(process.cwd(), "schemas"),
    resolve(process.cwd(), "../..", "schemas"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new AppError(
    "AI_GATEWAY_FAILED",
    "Runtime JSON Schema directory was not found",
    500,
  );
}
