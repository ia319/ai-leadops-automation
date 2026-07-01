# AI Providers

AI Gateway is the provider boundary. n8n stays independent from provider-specific APIs.

## Default Provider

Credential-free local development:

```env
AI_PROVIDER=mock
AI_MODEL=demo-leadops-model
```

Mock provider output: deterministic `AIProviderResult` objects without paid credentials.

## Provider API Decision Record

Official provider documentation is the source of truth for provider adapter work. No request shapes, response fields, retry behavior, or structured-output support from memory.

Implementation choices:

| Provider            | Interface choice                                                       | Reason                                                                                                      |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `mock`              | Local deterministic implementation                                     | Local demo and tests without credentials.                                                                   |
| `openai`            | OpenAI SDK with the Responses API and JSON Schema structured outputs   | OpenAI text generation and structured output guidance for official OpenAI models.                           |
| `anthropic`         | Anthropic SDK with native Messages API structured outputs              | Claude-native request semantics, system prompt handling, usage fields, errors, retry, and timeout behavior. |
| `openai-compatible` | Direct HTTP `fetch` to `<OPENAI_COMPATIBLE_BASE_URL>/chat/completions` | Compatibility with OpenAI-style endpoints without guaranteed Responses API or strict JSON Schema support.   |

Official OpenAI and Anthropic providers use structured outputs. The gateway derives a provider-safe structured-output schema from `schemas/ai-qualification-output.schema.json`, then runs full Ajv validation against the source schema. `openai-compatible` uses prompt constraints plus local JSON parsing and Ajv schema validation by default.

## Output Format Control

Controls work together. Prompt wording alone is insufficient for response shape.

| Provider            | Format control                                                                                               | Sampling control                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai`            | Responses API `text.format` with `type: "json_schema"` and `strict: true`, followed by local Ajv validation. | `AI_TEMPERATURE=0.2` when the selected model supports `temperature`. Verified exception: `gpt-5-mini` rejects this parameter.                           |
| `anthropic`         | Native Messages API structured output through `output_config.format`, followed by local Ajv validation.      | The adapter does not send `AI_TEMPERATURE`; the current SDK marks `temperature` as deprecated for newer Claude models.                                  |
| `openai-compatible` | Prompted JSON Schema constraints, local JSON parsing, and local Ajv validation.                              | `AI_TEMPERATURE=0.2` is sent to the Chat Completions-compatible endpoint; provider support depends on the selected OpenAI-compatible service and model. |

OpenAI public documentation defines the `temperature` parameter without a complete per-model support matrix. Verified model-specific exceptions belong in this section. Verified exception, 2026-07-01: `gpt-5-mini` -> `400 Unsupported parameter: 'temperature' is not supported with this model.` Compatible options: a model with `temperature` support, or OpenAI adapter logic that omits `temperature` for `gpt-5-mini`.

Anthropic TypeScript SDK source marks `temperature` as deprecated for models released after Claude Opus 4.6 and notes that non-`1.0` values can be rejected with `400`: <https://github.com/anthropics/anthropic-sdk-typescript/blob/cb829c764293963665481f0b2a60f2e0923270ac/src/resources/messages/messages.ts#L3207>

## Official Documentation Sources

Provider adapter sources:

- OpenAI text generation: <https://developers.openai.com/api/docs/guides/text>
- OpenAI Structured Outputs: <https://developers.openai.com/api/docs/guides/structured-outputs>
- OpenAI SDK libraries: <https://developers.openai.com/api/docs/libraries>
- OpenAI Chat Completions API reference: <https://platform.openai.com/docs/api-reference/chat/create>
- Anthropic TypeScript SDK: <https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript>
- Anthropic TypeScript SDK `temperature` source: <https://github.com/anthropics/anthropic-sdk-typescript/blob/cb829c764293963665481f0b2a60f2e0923270ac/src/resources/messages/messages.ts#L3207>
- Anthropic Messages API: <https://docs.anthropic.com/en/api/messages>
- Anthropic Structured Outputs: <https://platform.claude.com/docs/en/build-with-claude/structured-outputs>
- Anthropic OpenAI SDK compatibility: <https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk>

## Interface Decisions

Official OpenAI accounts:

```text
OpenAI SDK
Responses API
Structured Outputs with JSON Schema
```

Default official OpenAI adapter: Responses API. Chat Completions only for explicit model or account requirements.

Official Claude accounts:

```text
Anthropic SDK
Messages API
Structured Outputs with output_config.format
```

Primary Claude adapter: native Anthropic. No Anthropic OpenAI compatibility layer for the primary Claude path.

The Anthropic adapter does not send `AI_TEMPERATURE`. The current SDK marks `temperature` as deprecated for newer Claude models and notes that non-`1.0` values can be rejected.

Generic OpenAI-style services:

```text
fetch
POST <OPENAI_COMPATIBLE_BASE_URL>/chat/completions
messages[]
```

Generic OpenAI-compatible services do not imply support for the OpenAI Responses API, SDK parse helpers, or strict JSON Schema. Those features remain optional future configuration, not default behavior.

## Runtime Contract

AI Gateway input:

```json
{
  "lead": {}
}
```

Provider-neutral response:

```json
{
  "provider": "mock",
  "model": "demo-leadops-model",
  "output": {},
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0
  }
}
```

Provider-specific calls stay inside `apps/ai-gateway/src/providers/`.

## Provider Adapter Addition

Provider file:

```text
apps/ai-gateway/src/providers/<provider>.ts
```

Implement this interface:

```ts
export interface AIProvider {
  qualifyLead(input: NormalizedLead): Promise<AIProviderResult>;
}
```

Return:

```ts
export interface AIProviderResult {
  readonly output: AIQualificationOutput;
  readonly usage: {
    readonly input_tokens: number;
    readonly output_tokens: number;
  };
}
```

Parse provider responses into `AIQualificationOutput`.

Validate the final object with Ajv through `validateAIQualificationOutput`.

Schema-compatible values:

- Exact enum values
- `null` for missing optional fields
- `lead_score` between `0` and `100`
- `suggested_sms_reply` under `240` characters

## Register a Provider

Update these files:

```text
apps/ai-gateway/src/config.ts
apps/ai-gateway/src/providers/index.ts
```

Provider configuration does not require n8n workflow changes.

Credential environment variables:

```env
OPENAI_API_KEY=
OPENAI_MODEL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
OPENAI_COMPATIBLE_API_KEY=
OPENAI_COMPATIBLE_BASE_URL=
OPENAI_COMPATIBLE_MODEL=
```

## Test Provider Switching

`mock` tests:

```sh
AI_PROVIDER=mock pnpm --filter ai-gateway test
```

Adapter tests:

```sh
pnpm --filter ai-gateway test
```

Same `/v1/qualify-lead` request per provider. Response shape unchanged.

AI provider switching uses gateway configuration only. No n8n workflow JSON edits.
