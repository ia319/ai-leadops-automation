import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppError } from "../src/errors.js";
import { parseJsonObject } from "../src/utils/json-parser.js";

describe("JSON parser", () => {
  it("returns object inputs unchanged", () => {
    const value = {
      priority: "High",
    };

    assert.deepEqual(parseJsonObject(value), value);
  });

  it("parses plain JSON objects", () => {
    assert.deepEqual(parseJsonObject('{"priority":"High"}'), {
      priority: "High",
    });
  });

  it("parses fenced JSON objects", () => {
    assert.deepEqual(parseJsonObject('```json\n{"priority":"High"}\n```'), {
      priority: "High",
    });
  });

  it("extracts the first balanced JSON object", () => {
    assert.deepEqual(parseJsonObject('Result: {"priority":"High"} done'), {
      priority: "High",
    });
  });

  it("maps invalid payloads to AI_PARSE_FAILED", () => {
    assert.throws(
      () => parseJsonObject("not json"),
      (error) => error instanceof AppError && error.code === "AI_PARSE_FAILED",
    );
  });
});
