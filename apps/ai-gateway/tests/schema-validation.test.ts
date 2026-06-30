import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import type { AnySchema, ValidateFunction } from "ajv";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats") as (ajv: AjvInstance) => AjvInstance;

interface AjvInstance {
  compile(schema: AnySchema): ValidateFunction;
}

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testDir, "../../..");

async function readJson<T>(path: string): Promise<T> {
  const content = await readFile(resolve(rootDir, path), "utf8");
  return JSON.parse(content) as T;
}

describe("schema validation", () => {
  it("validates input examples", async () => {
    const ajv = addFormats(new Ajv2020({ allErrors: true }));
    const schema = await readJson<object>("schemas/lead-input.schema.json");
    const validate = ajv.compile(schema);

    assert.equal(
      validate(await readJson("examples/inputs/website-form.json")),
      true,
    );
    assert.equal(
      validate(await readJson("examples/inputs/paid-ad-lead.json")),
      true,
    );
    assert.equal(
      validate(await readJson("examples/inputs/missed-call-transcript.json")),
      true,
    );
    assert.equal(
      validate(await readJson("examples/inputs/invalid-input.json")),
      false,
    );
  });

  it("validates normalized lead examples", async () => {
    const ajv = addFormats(new Ajv2020({ allErrors: true }));
    const schema = await readJson<object>(
      "schemas/normalized-lead.schema.json",
    );
    const validate = ajv.compile(schema);
    const request = await readJson<{ lead: unknown }>(
      "examples/inputs/website-form-normalized.json",
    );

    assert.equal(validate(request.lead), true);
  });

  it("validates qualification output examples", async () => {
    const ajv = addFormats(new Ajv2020({ allErrors: true }));
    const schema = await readJson<object>(
      "schemas/ai-qualification-output.schema.json",
    );
    const validate = ajv.compile(schema);

    assert.equal(
      validate(await readJson("examples/outputs/qualified-high-priority.json")),
      true,
    );
    assert.equal(
      validate(
        await readJson("examples/outputs/qualified-medium-priority.json"),
      ),
      true,
    );
    assert.equal(
      validate(await readJson("examples/outputs/low-priority.json")),
      true,
    );
  });

  it("rejects invalid qualification outputs", async () => {
    const ajv = addFormats(new Ajv2020({ allErrors: true }));
    const schema = await readJson<object>(
      "schemas/ai-qualification-output.schema.json",
    );
    const validate = ajv.compile(schema);
    const validOutput = await readJson<Record<string, unknown>>(
      "examples/outputs/qualified-high-priority.json",
    );

    assert.equal(validate({ ...validOutput, lead_score: undefined }), false);
    assert.equal(validate({ ...validOutput, priority: "Urgent" }), false);
    assert.equal(validate({ ...validOutput, lead_score: 101 }), false);
  });

  it("validates CRM records", async () => {
    const ajv = addFormats(new Ajv2020({ allErrors: true }));
    const schema = await readJson<object>("schemas/crm-record.schema.json");
    const validate = ajv.compile(schema);
    const validRecord = {
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
    };

    assert.equal(validate(validRecord), true);
    assert.equal(validate({ ...validRecord, lead_score: 101 }), false);
    assert.equal(
      validate({ ...validRecord, pipeline_stage: "Contacted" }),
      false,
    );
    assert.equal(
      validate({ ...validRecord, extra_field: "unexpected" }),
      false,
    );
  });

  it("validates error response examples", async () => {
    const ajv = addFormats(new Ajv2020({ allErrors: true }));
    const schema = await readJson<object>("schemas/api-error.schema.json");
    const validate = ajv.compile(schema);

    assert.equal(
      validate(await readJson("examples/outputs/validation-failed.json")),
      true,
    );
  });
});
