import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../config.js";
import { AppError, buildErrorResponse } from "../errors.js";
import { createAIProvider } from "../providers/index.js";
import {
  validateAIQualificationOutput,
  validateQualifyLeadRequest,
} from "../validation/json-schema-validator.js";

export async function registerQualifyLeadRoute(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  const provider = createAIProvider({
    provider: config.aiProvider,
    model: config.aiModel,
    temperature: config.aiTemperature,
    maxTokens: config.aiMaxTokens,
    timeoutMs: config.aiTimeoutMs,
    retryCount: config.aiRetryCount,
    ...(config.aiApiKey === undefined ? {} : { apiKey: config.aiApiKey }),
    ...(config.aiBaseUrl === undefined ? {} : { baseUrl: config.aiBaseUrl }),
  });

  app.post("/v1/qualify-lead", async (request, reply) => {
    try {
      const parsedRequest = validateQualifyLeadRequest(request.body);
      const result = await provider.qualifyLead(parsedRequest.lead);
      const validatedOutput = validateAIQualificationOutput(result.output);

      return {
        provider: config.aiProvider,
        model: config.aiModel,
        output: validatedOutput,
        usage: result.usage,
      };
    } catch (error) {
      const appError = normalizeRouteError(error);
      return reply
        .status(appError.statusCode)
        .send(buildErrorResponse(appError));
    }
  });
}

function normalizeRouteError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError("UNKNOWN_ERROR", "Lead qualification failed", 500);
}
