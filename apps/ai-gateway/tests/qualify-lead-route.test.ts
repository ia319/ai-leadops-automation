import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { loadConfig } from "../src/config.js";
import type { QualificationResponse } from "../src/types.js";
import { createNormalizedLead } from "./fixtures.js";

const config: AppConfig = {
  port: 8787,
  logLevel: "silent",
  aiProvider: "mock",
  aiModel: "demo-leadops-model"
};

describe("AI Gateway routes", () => {
  it("returns health status", async () => {
    const app = await buildApp(config);
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: "ok",
      provider: "mock"
    });
    await app.close();
  });

  it("qualifies a valid normalized lead", async () => {
    const app = await buildApp(config);
    const response = await app.inject({
      method: "POST",
      url: "/v1/qualify-lead",
      payload: {
        lead: createNormalizedLead()
      }
    });
    const body = response.json<QualificationResponse>();

    assert.equal(response.statusCode, 200);
    assert.equal(body.provider, "mock");
    assert.equal(body.model, "demo-leadops-model");
    assert.equal(body.output.priority, "High");
    await app.close();
  });

  it("returns structured errors for invalid payloads", async () => {
    const app = await buildApp(config);
    const response = await app.inject({
      method: "POST",
      url: "/v1/qualify-lead",
      payload: {
        source: "website_form"
      }
    });
    const body = response.json<{ status: string; error: { code: string } }>();

    assert.equal(response.statusCode, 400);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "INVALID_INPUT");
    await app.close();
  });

  it("rejects unsupported provider config", () => {
    assert.throws(() =>
      loadConfig({
        AI_PROVIDER: "unsupported",
        PORT: "8787"
      })
    , /Unsupported AI provider: unsupported/);
  });
});
