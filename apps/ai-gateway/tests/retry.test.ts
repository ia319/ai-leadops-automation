import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { withRetry } from "../src/utils/retry.js";

describe("retry utility", () => {
  it("returns the first successful result", async () => {
    const result = await withRetry(async () => "ok", {
      attempts: 2,
      delayMs: 0,
    });

    assert.equal(result, "ok");
  });

  it("retries retryable failures", async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("temporary");
        }

        return "ok";
      },
      {
        attempts: 2,
        delayMs: 0,
      },
    );

    assert.equal(result, "ok");
    assert.equal(attempts, 2);
  });

  it("does not retry non-retryable failures", async () => {
    let attempts = 0;

    await assert.rejects(
      () =>
        withRetry(
          async () => {
            attempts += 1;
            throw new Error("permanent");
          },
          {
            attempts: 3,
            delayMs: 0,
            shouldRetry: () => false,
          },
        ),
      /permanent/,
    );

    assert.equal(attempts, 1);
  });
});
