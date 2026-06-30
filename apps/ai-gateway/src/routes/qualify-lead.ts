import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import type { AppConfig } from "../config.js";
import { AppError, buildErrorResponse } from "../errors.js";
import { createAIProvider } from "../providers/index.js";
import { aiQualificationOutputSchema } from "../schemas/ai-qualification-output.js";
import { qualifyLeadRequestSchema } from "../schemas/normalized-lead.js";

export async function registerQualifyLeadRoute(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  const provider = createAIProvider({
    provider: config.aiProvider,
    model: config.aiModel,
  });

  app.post("/v1/qualify-lead", async (request, reply) => {
    try {
      const parsedRequest = qualifyLeadRequestSchema.parse(request.body);
      const output = await provider.qualifyLead(parsedRequest.lead);
      const validatedOutput = aiQualificationOutputSchema.parse(output);

      return {
        provider: config.aiProvider,
        model: config.aiModel,
        output: validatedOutput,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
        },
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

  if (error instanceof ZodError) {
    return new AppError(
      "INVALID_INPUT",
      "Request body failed validation",
      400,
      {
        issues: error.issues,
      },
    );
  }

  return new AppError("UNKNOWN_ERROR", "Lead qualification failed", 500);
}
