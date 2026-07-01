# Architecture

n8n handles orchestration. AI Gateway handles provider switching. Schemas define contracts. Workflow logs provide observability.

## Runtime Flow

Request path:

```text
Raw webhook payload
  -> n8n Normalize Lead
  -> n8n Validate Lead
  -> AI Gateway /v1/qualify-lead
  -> Provider adapter
  -> AIQualificationOutput
  -> n8n Validate AI Output
  -> CRM record
  -> Google Sheets, Slack, Gmail, SMS draft, booking link
  -> ExecutionLogs or ErrorLogs
  -> Webhook response
```

## Module Boundaries

Single responsibility boundaries:

| Area                             | Responsibility                                                      |
| -------------------------------- | ------------------------------------------------------------------- |
| `workflows/n8n/`                 | Orchestrate lead intake, downstream actions, errors, and summaries. |
| `apps/ai-gateway/`               | Accept normalized leads and return provider-neutral AI output.      |
| `apps/ai-gateway/src/providers/` | Hide provider-specific API behavior.                                |
| `schemas/`                       | Define input, output, CRM, error, and API contracts.                |
| `examples/`                      | Provide fake payloads and expected output shapes.                   |
| `docs/`                          | Explain setup, behavior, contracts, testing, and extension.         |

## Gateway Boundary

n8n owns raw input normalization.

Gateway input shape:

```json
{
  "lead": {}
}
```

Gateway output: provider metadata, standardized AI output, and usage data.

Invalid gateway input returns a structured API error.

## Workflow Boundary

n8n workflow responsibilities:

- Normalize raw lead payloads
- Validate required source, contact, and content fields
- Call the AI Gateway
- Validate AI output before downstream actions
- Build a CRM record
- Append Google Sheets rows
- Route high-priority Slack alerts
- Gmail draft creation without automatic lead reply sending
- Generate SMS draft text without sending SMS
- Attach booking links
- Write success and error logs

## Error Flow

Validation and AI errors route to `ErrorLogs` and return a structured webhook error.

CRM write failures are critical workflow failures. Error handler workflow captures runtime failures.

Slack and Gmail failures are main workflow warnings. Lead path continues and warnings appear in `ExecutionLogs`.

## Provider Switching

n8n remains unchanged during provider switching.

Provider adapters live under `apps/ai-gateway/src/providers/`.

Provider selection uses `AI_PROVIDER` and provider-specific environment variables: `mock`, `openai`, `anthropic`, or `openai-compatible`.

## Data Contracts

Schemas:

```text
schemas/lead-input.schema.json
schemas/normalized-lead.schema.json
schemas/qualify-lead-request.schema.json
schemas/ai-qualification-output.schema.json
schemas/crm-record.schema.json
schemas/error-log.schema.json
schemas/api-error.schema.json
```

Schema changes require matching examples and tests.
