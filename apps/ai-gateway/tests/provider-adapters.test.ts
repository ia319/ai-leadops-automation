import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { AnthropicProvider } from "../src/providers/anthropic.js";
import { OpenAIProvider } from "../src/providers/openai.js";
import { OpenAICompatibleProvider } from "../src/providers/openai-compatible.js";
import type { AIProviderConfig } from "../src/providers/types.js";
import type { AIQualificationOutput } from "../src/types.js";
import { createNormalizedLead } from "./fixtures.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testDir, "../../..");

const baseConfig: AIProviderConfig = {
  provider: "openai",
  model: "test-model",
  apiKey: "test-key",
  temperature: 0.2,
  maxTokens: 1200,
  timeoutMs: 30000,
  retryCount: 2,
};

async function readJson<T>(path: string): Promise<T> {
  const content = await readFile(resolve(rootDir, path), "utf8");
  return JSON.parse(content) as T;
}

describe("provider adapters", () => {
  it("calls OpenAI Responses API with JSON Schema structured output", async () => {
    const expectedOutput = await readJson<AIQualificationOutput>(
      "examples/outputs/qualified-high-priority.json",
    );
    const provider = new OpenAIProvider(baseConfig, {
      responses: {
        create: async (params) => {
          assert.equal(params.model, "test-model");
          assert.equal(params.text.format.type, "json_schema");
          assert.equal(params.text.format.strict, true);
          assert.equal(
            params.text.format.schema.title,
            "AIQualificationOutput",
          );
          assert.match(params.input, /lead_test_001/);

          return {
            output_text: JSON.stringify(expectedOutput),
            usage: {
              input_tokens: 11,
              output_tokens: 22,
            },
          };
        },
      },
    });

    const result = await provider.qualifyLead(createNormalizedLead());

    assert.deepEqual(result.output, expectedOutput);
    assert.deepEqual(result.usage, {
      input_tokens: 11,
      output_tokens: 22,
    });
  });

  it("calls Anthropic Messages API with output_config JSON Schema", async () => {
    const expectedOutput = await readJson<AIQualificationOutput>(
      "examples/outputs/qualified-high-priority.json",
    );
    const provider = new AnthropicProvider(
      {
        ...baseConfig,
        provider: "anthropic",
      },
      {
        messages: {
          create: async (params) => {
            assert.equal(params.model, "test-model");
            assert.equal(params.output_config.format.type, "json_schema");
            assert.equal(
              params.output_config.format.schema.title,
              "AIQualificationOutput",
            );
            assert.equal("temperature" in params, false);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(expectedOutput),
                },
              ],
              usage: {
                input_tokens: 33,
                output_tokens: 44,
              },
            };
          },
        },
      },
    );

    const result = await provider.qualifyLead(createNormalizedLead());

    assert.deepEqual(result.output, expectedOutput);
    assert.deepEqual(result.usage, {
      input_tokens: 33,
      output_tokens: 44,
    });
  });

  it("calls OpenAI-compatible chat completions over HTTP", async () => {
    const expectedOutput = await readJson<AIQualificationOutput>(
      "examples/outputs/qualified-high-priority.json",
    );
    const fetchClient: typeof fetch = async (url, init) => {
      assert.equal(String(url), "https://example.test/v1/chat/completions");
      assert.equal(init?.method, "POST");
      assert.equal(
        (init?.headers as Record<string, string>).authorization,
        "Bearer test-key",
      );
      const body = JSON.parse(String(init?.body)) as {
        readonly model: string;
        readonly messages: ReadonlyArray<{
          readonly role: string;
          readonly content: string;
        }>;
      };

      assert.equal(body.model, "test-model");
      assert.equal(body.messages[0]?.role, "system");
      assert.match(body.messages[0]?.content ?? "", /AIQualificationOutput/);
      assert.equal(body.messages[1]?.role, "user");

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(expectedOutput),
              },
            },
          ],
          usage: {
            prompt_tokens: 55,
            completion_tokens: 66,
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };
    const provider = new OpenAICompatibleProvider(
      {
        ...baseConfig,
        provider: "openai-compatible",
        baseUrl: "https://example.test/v1",
      },
      fetchClient,
    );

    const result = await provider.qualifyLead(createNormalizedLead());

    assert.deepEqual(result.output, expectedOutput);
    assert.deepEqual(result.usage, {
      input_tokens: 55,
      output_tokens: 66,
    });
  });
});
