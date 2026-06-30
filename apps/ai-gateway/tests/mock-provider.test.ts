import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MockProvider } from "../src/providers/mock.js";
import { validateAIQualificationOutput } from "../src/validation/json-schema-validator.js";
import { createNormalizedLead } from "./fixtures.js";

const provider = new MockProvider({
  provider: "mock",
  model: "demo-leadops-model",
  temperature: 0.2,
  maxTokens: 1200,
  timeoutMs: 30000,
  retryCount: 2,
});

describe("MockProvider", () => {
  it("returns high priority output for booking requests", async () => {
    const result = await provider.qualifyLead(createNormalizedLead());
    const output = result.output;

    assert.deepEqual(validateAIQualificationOutput(output), output);
    assert.equal(output.priority, "High");
    assert.ok(output.lead_score >= 75);
  });

  it("returns medium priority output for vague interest", async () => {
    const result = await provider.qualifyLead(
      createNormalizedLead({
        source: "facebook_ad",
        content: {
          message: "Interested in automating customer follow-up.",
          transcript: null,
        },
      }),
    );
    const output = result.output;

    assert.deepEqual(validateAIQualificationOutput(output), output);
    assert.equal(output.priority, "Medium");
  });

  it("returns high priority output for missed call quote requests", async () => {
    const result = await provider.qualifyLead(
      createNormalizedLead({
        source: "missed_call_transcript",
        content: {
          message: null,
          transcript:
            "Hi, I need a quote for commercial cleaning next week. Please call me back.",
        },
      }),
    );
    const output = result.output;

    assert.deepEqual(validateAIQualificationOutput(output), output);
    assert.equal(output.priority, "High");
    assert.equal(output.intent, "Request Quote");
  });

  it("returns low priority output for spam-like input", async () => {
    const result = await provider.qualifyLead(
      createNormalizedLead({
        content: {
          message: "Claim this crypto giveaway now. Unsubscribe me.",
          transcript: null,
        },
      }),
    );
    const output = result.output;

    assert.deepEqual(validateAIQualificationOutput(output), output);
    assert.equal(output.priority, "Low");
  });
});
