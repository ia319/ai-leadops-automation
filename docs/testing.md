# Testing

Automated checks cover the AI Gateway. Manual checks cover imported n8n workflows.

## Local Checks

Formatting:

```sh
pnpm format:check
```

Type checks:

```sh
pnpm lint
```

Tests:

```sh
pnpm test
```

Gateway build:

```sh
pnpm --filter ai-gateway build
```

Check whitespace:

```sh
git diff --check
```

## Test Coverage

Test files:

```text
apps/ai-gateway/tests/schema-validation.test.ts
apps/ai-gateway/tests/json-schema-validator.test.ts
apps/ai-gateway/tests/json-parser.test.ts
apps/ai-gateway/tests/retry.test.ts
apps/ai-gateway/tests/mock-provider.test.ts
apps/ai-gateway/tests/provider-adapters.test.ts
apps/ai-gateway/tests/qualify-lead-route.test.ts
```

Cover these areas:

- Raw input examples
- Normalized lead examples
- AI output examples
- CRM record schema
- API error response schema
- Ajv runtime validators
- AI JSON parsing
- Retry behavior
- Mock provider output behavior
- OpenAI, Anthropic, and OpenAI-compatible adapter request/response mapping
- `/health`
- `/v1/qualify-lead`
- Invalid request bodies
- Unsupported and incomplete provider configuration

## Test the Gateway Manually

Gateway startup:

```sh
pnpm dev
```

Call health:

```sh
curl http://localhost:8787/health
```

Call qualification:

```sh
curl -sS http://localhost:8787/v1/qualify-lead \
  -H "Content-Type: application/json" \
  --data-binary @examples/inputs/website-form-normalized.json
```

## Test Provider Switching

Automated adapter tests first:

```sh
pnpm --filter ai-gateway test
```

For `mock`, start the gateway normally and call `/v1/qualify-lead`.

For `openai`, set:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=
```

For `anthropic`, set:

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
```

For `openai-compatible`, set:

```env
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_API_KEY=
OPENAI_COMPATIBLE_BASE_URL=
OPENAI_COMPATIBLE_MODEL=
```

Same normalized request:

```sh
curl -sS http://localhost:8787/v1/qualify-lead \
  -H "Content-Type: application/json" \
  --data-binary @examples/inputs/website-form-normalized.json
```

Provider and model may change. Response shape must stay unchanged.

## Test the Demo Workflow

Workflow path: `workflows/n8n/leadops-demo.workflow.json`.

Test mode: one request after each **Execute workflow** click. Test URL: `http://localhost:5678/webhook-test/leadops-demo`.

Active mode: repeated requests after workflow activation. Curl scripts use `WEBHOOK_URL`:

```sh
WEBHOOK_URL="http://localhost:5678/webhook/leadops-demo" sh examples/curl/website-form.sh
WEBHOOK_URL="http://localhost:5678/webhook/leadops-demo" sh examples/curl/paid-ad-lead.sh
WEBHOOK_URL="http://localhost:5678/webhook/leadops-demo" sh examples/curl/missed-call-transcript.sh
WEBHOOK_URL="http://localhost:5678/webhook/leadops-demo" sh examples/curl/invalid-input.sh
```

Expected responses: success for valid examples, error for `invalid-input.json`.

## Test the Main Workflow

Workflow imports:

```text
workflows/n8n/leadops-main.workflow.json
workflows/n8n/leadops-error-handler.workflow.json
```

Prerequisites:

- AI Gateway startup: `pnpm dev`
- n8n startup: `--env-file .env`
- n8n environment access: `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
- Docker Desktop gateway URL: `AI_GATEWAY_URL=http://host.docker.internal:8787`
- Google Sheet document ID: `GOOGLE_SHEETS_DOCUMENT_ID`
- Slack channel ID: `SLACK_CHANNEL_ID`
- Google Sheet bottom tabs: `Leads`, `ExecutionLogs`, and `ErrorLogs`
- Google Sheets credentials on every Google Sheets node
- Slack credentials on every Slack node
- Gmail credentials on every Gmail node

Test mode first. `/webhook-test/` handles one request after manual execution starts.

High-priority lead request:

```powershell
curl.exe -sS -X POST "http://localhost:5678/webhook-test/leadops-main" -H "Content-Type: application/json" --data-binary "@examples/inputs/website-form.json"
```

Expected result:

- AI Gateway: normalized lead received
- `Leads`: one new row
- Slack: one high-priority alert
- Gmail: one draft
- SMS: draft text in workflow output
- `ExecutionLogs`: one new row
- Response status: `success` or `success_with_warnings`
- Mock mode score for `website-form.json`: `lead_score: 86`

Sink output checks:

- Google Sheet `Leads` tab
- Google Sheet `ExecutionLogs` tab
- Configured Slack channel
- Gmail Drafts

Workflow activation only after test mode success. `/webhook/` handles repeated requests:

```powershell
curl.exe -sS -X POST "http://localhost:5678/webhook/leadops-main" -H "Content-Type: application/json" --data-binary "@examples/inputs/website-form.json"
```

Sample file purpose: smoke testing only. Real form, ad, or call systems send mapped JSON payloads to the active webhook. Payload shape: [Setup](setup.md).

## Test Error Paths

Invalid input request:

```powershell
curl.exe -sS -X POST "http://localhost:5678/webhook-test/leadops-main" -H "Content-Type: application/json" --data-binary "@examples/inputs/invalid-input.json"
```

Expected result:

- `ErrorLogs`: one new row with redacted diagnostic fields
- `Leads`: no new row
- Response: structured error
- Error code: `MISSING_CONTACT_METHOD` or `MISSING_MESSAGE_CONTENT`

Additional `/webhook-test/` request requires another **Execute workflow** click.

## Capture Manual Evidence

Workflow overview screenshot and focused sink screenshots:

```text
assets/n8n-workflow-overview.png
assets/google-sheets-leads.png
assets/slack-alert.png
assets/gmail-draft.png
assets/google-sheets-error-log.png
```

Workflow run GIF:

```text
assets/main-workflow-run.gif
```

GIF focus: terminal request, n8n execution, final successful output. Google Sheets, Slack, and Gmail evidence can use screenshots when window switching reduces GIF clarity.

Personal data hidden before asset commits:

- API keys
- OAuth client secrets
- Google Sheet document IDs
- Gmail account addresses
- Slack workspace names that identify a real organization
- Slack user names and avatars
- Production webhook URLs

## Test Daily Summary

Workflow path: `workflows/n8n/leadops-daily-summary.workflow.json`.

Environment value:

```env
DAILY_SUMMARY_RECIPIENT=ops@example.com
```

Manual workflow execution.

Expected result:

- `Leads` read
- `ErrorLogs` read
- Total calculations
- Summary email through Gmail
