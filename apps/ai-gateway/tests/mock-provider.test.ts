import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MockProvider } from "../src/providers/mock.js";
import { aiQualificationOutputSchema } from "../src/schemas/ai-qualification-output.js";
import { createNormalizedLead } from "./fixtures.js";

const provider = new MockProvider({
  provider: "mock",
  model: "demo-leadops-model",
});

describe("MockProvider", () => {
  it("returns high priority output for booking requests", async () => {
    const output = await provider.qualifyLead(createNormalizedLead());

    assert.deepEqual(aiQualificationOutputSchema.parse(output), output);
    assert.equal(output.priority, "High");
    assert.ok(output.lead_score >= 75);
  });

  it("returns medium priority output for vague interest", async () => {
    const output = await provider.qualifyLead(
      createNormalizedLead({
        source: "facebook_ad",
        content: {
          message: "Interested in automating customer follow-up.",
          transcript: null,
        },
      }),
    );

    assert.deepEqual(aiQualificationOutputSchema.parse(output), output);
    assert.equal(output.priority, "Medium");
  });

  it("returns high priority output for missed call quote requests", async () => {
    const output = await provider.qualifyLead(
      createNormalizedLead({
        source: "missed_call_transcript",
        content: {
          message: null,
          transcript:
            "Hi, I need a quote for commercial cleaning next week. Please call me back.",
        },
      }),
    );

    assert.deepEqual(aiQualificationOutputSchema.parse(output), output);
    assert.equal(output.priority, "High");
    assert.equal(output.intent, "Request Quote");
  });

  it("returns low priority output for spam-like input", async () => {
    const output = await provider.qualifyLead(
      createNormalizedLead({
        content: {
          message: "Claim this crypto giveaway now. Unsubscribe me.",
          transcript: null,
        },
      }),
    );

    assert.deepEqual(aiQualificationOutputSchema.parse(output), output);
    assert.equal(output.priority, "Low");
  });
});
