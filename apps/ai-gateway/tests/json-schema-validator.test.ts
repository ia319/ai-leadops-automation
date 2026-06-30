import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { AppError } from "../src/errors.js";
import {
  getAIQualificationOutputJsonSchema,
  getAIQualificationStructuredOutputJsonSchema,
  validateAIQualificationOutput,
  validateApiErrorResponse,
  validateCrmRecord,
  validateQualifyLeadRequest,
} from "../src/validation/json-schema-validator.js";
import { createNormalizedLead } from "./fixtures.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testDir, "../../..");

async function readJson<T>(path: string): Promise<T> {
  const content = await readFile(resolve(rootDir, path), "utf8");
  return JSON.parse(content) as T;
}

describe("JSON Schema validator", () => {
  it("validates qualification requests", () => {
    const request = validateQualifyLeadRequest({
      lead: createNormalizedLead(),
    });

    assert.equal(request.lead.source, "website_form");
  });

  it("maps request validation errors to INVALID_INPUT", () => {
    assert.throws(
      () => validateQualifyLeadRequest({ source: "website_form" }),
      (error) =>
        error instanceof AppError &&
        error.code === "INVALID_INPUT" &&
        error.statusCode === 400,
    );
  });

  it("validates AI qualification outputs", async () => {
    const output = validateAIQualificationOutput(
      await readJson("examples/outputs/qualified-high-priority.json"),
    );

    assert.equal(output.priority, "High");
  });

  it("derives a provider-safe structured output schema", () => {
    const sourceSchema = getAIQualificationOutputJsonSchema();
    const providerSchema = getAIQualificationStructuredOutputJsonSchema();

    assert.equal(
      sourceSchema.$schema,
      "https://json-schema.org/draft/2020-12/schema",
    );
    assert.equal(providerSchema.$schema, undefined);
    assert.match(JSON.stringify(sourceSchema), /minLength/);
    assert.doesNotMatch(JSON.stringify(providerSchema), /minLength/);
  });

  it("maps AI output validation errors to AI_SCHEMA_VALIDATION_FAILED", () => {
    const invalidOutput = {
      priority: "Urgent",
    };

    assert.throws(
      () => validateAIQualificationOutput(invalidOutput),
      (error) =>
        error instanceof AppError &&
        error.code === "AI_SCHEMA_VALIDATION_FAILED" &&
        error.statusCode === 502,
    );
  });

  it("validates CRM records", () => {
    const record = validateCrmRecord({
      lead_id: "lead_test_001",
      received_at: "2026-06-29T19:20:00Z",
      source: "website_form",
      name: "Sarah Lee",
      email: "sarah@example.com",
      phone: "+15551234567",
      company: "GrowthPilot",
      lead_type: "Sales Inquiry",
      intent: "Book Consultation",
      priority: "High",
      lead_score: 86,
      service_requested: "Appointment booking automation",
      pain_point: "Manual scheduling and delayed follow-up",
      lead_summary:
        "The lead wants help automating appointment booking and lead follow-up.",
      recommended_next_step:
        "Send a booking link and ask about current scheduling tools.",
      pipeline_stage: "New Qualified Lead",
      follow_up_status: "Draft Created",
      email_draft: "Hi Sarah, thanks for reaching out.",
      sms_draft: "Hi Sarah, would you like to schedule a quick consultation?",
      booking_link: "https://calendly.com/demo/intro-call",
      status: "DRAFT_CREATED",
      error_code: null,
    });

    assert.equal(record.status, "DRAFT_CREATED");
  });

  it("validates API error responses", async () => {
    const response = validateApiErrorResponse(
      await readJson("examples/outputs/validation-failed.json"),
    );

    assert.equal(response.error.code, "MISSING_CONTACT_METHOD");
  });
});
