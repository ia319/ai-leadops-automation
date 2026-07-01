# Troubleshooting

Local gateway, workflow, schema, and sink failure diagnosis.

## Gateway Does Not Start

Check dependencies:

```sh
pnpm install --frozen-lockfile
```

Check `PORT`:

```env
PORT=8787
```

Run:

```sh
pnpm dev
```

Port conflict: choose another port when `8787` is already in use.

## `/health` Fails

Call the endpoint:

```sh
curl http://localhost:8787/health
```

Gateway process running.

`.env` exists.

`AI_PROVIDER` value:

```text
mock
openai
anthropic
openai-compatible
```

For non-mock providers, verify the matching API key, model, and base URL variables in [Configuration](configuration.md).

## AI Provider Request Fails

Mock provider first:

```env
AI_PROVIDER=mock
AI_MODEL=demo-leadops-model
```

Real provider switch only after mock path success.

For OpenAI, set:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=
```

For Anthropic, set:

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
```

Interpret provider errors by class:

- `401 invalid_api_key` or `401 invalid x-api-key`: replace the API key
- `429 insufficient_quota`: add API billing or use a funded key
- `400 Unsupported parameter: 'temperature'`: select a model that supports `temperature` or update the OpenAI adapter to omit it
- `model_not_found`: verify the model name and account access
- Connection timeout before any API response: retry with a working network path

ChatGPT subscription is not API billing. Provider API key with API access required.

## `/v1/qualify-lead` Returns `INVALID_INPUT`

Request shape:

```json
{
  "lead": {}
}
```

Normalized example:

```sh
curl -sS http://localhost:8787/v1/qualify-lead \
  -H "Content-Type: application/json" \
  --data-binary @examples/inputs/website-form-normalized.json
```

Lead requirements:

- `lead_id`
- `source`
- `received_at`
- `contact.email` or `contact.phone`
- `content.message` or `content.transcript`

## n8n Cannot Reach the Gateway

n8n runtime URL:

```env
AI_GATEWAY_URL=http://localhost:8787
```

Docker Desktop n8n value:

```env
AI_GATEWAY_URL=http://host.docker.internal:8787
```

n8n HTTP Request node manual execution.

Host AI Gateway check:

```sh
curl http://localhost:8787/health
```

Docker-based n8n requires `host.docker.internal`, not `localhost`.

## n8n Reports `access to env vars denied`

n8n startup with environment access:

Stop the existing container:

```powershell
docker stop n8n
```

`No such container` means no remove step.

Remove the stopped container:

```powershell
docker rm n8n
```

Container creation with the same `n8n_data` volume:

```powershell
docker run -d --name n8n -p 5678:5678 --env-file .env -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n:2.25.4
```

Relevant node expression error:

```text
[ERROR: access to env vars denied]
```

`--env-file .env` supplies `GOOGLE_SHEETS_DOCUMENT_ID`, `SLACK_CHANNEL_ID`, `AI_GATEWAY_URL`, and `BOOKING_LINK` to n8n.

Container recreation required after `.env` changes. The command above keeps the `n8n_data` volume and preserves n8n workflows and credentials.

## Google Sheets Fails

Checks:

- `GOOGLE_SHEETS_DOCUMENT_ID`
- Google Sheets credential selected on each Google Sheets node
- Sheet tabs: `Leads`, `ExecutionLogs`, and `ErrorLogs`
- Credential account edit access
- Column names matching workflow mappings

`Leads`, `ExecutionLogs`, and `ErrorLogs` write failures are critical.

### `Sheet with name Leads not found`

Target Google Sheet: `GOOGLE_SHEETS_DOCUMENT_ID`.

Required bottom tab names:

```text
Leads
ExecutionLogs
ErrorLogs
```

These names belong to bottom tabs, not column `A` values in one tab. n8n searches sheet tabs by name.

Capitalization and trailing spaces matter. `Leads` and `leads` are different names.

### `Node does not have any credentials set`

Google Sheets credential nodes:

```text
Append Google Sheets Row
Append Success Log
Append Error Log Row
Read Leads
Read ErrorLogs
```

Workflow save after credential confirmation.

Old right-panel output can remain visible until the next node or workflow execution.

### `No columns found in Google Sheets`

Target tab header location: `A1`.

Exact headers: [Configuration](configuration.md).

Single-cell paste fix: **Data > Split text to columns** with tab as the separator.

## Slack Fails

Checks:

- `SLACK_CHANNEL_ID`
- Slack credential selected on the Slack node
- App posting permission in the configured channel
- Lead score at least `75`

Slack failure behavior: workflow warning, not main lead path stop.

Main workflow Slack credential type: Slack OAuth. `SLACK_WEBHOOK_URL` applies only after changing the workflow to an HTTP Request node.

Channel ID, not channel name:

```text
C0123456789
```

Channel ID location:

```text
https://app.slack.com/client/Txxxxxxx/C0123456789
```

Slack app installation block: confirmed Slack account email address and workspace admin installation.

## Gmail Draft Fails

Checks:

- Gmail credential selected on the Gmail node
- Lead email address
- Credential account draft creation permission

Gmail draft failure behavior: workflow warning, not main lead path stop.

Main workflow Gmail behavior: draft creation only. No automatic lead follow-up email sending.

Draft verification location: Gmail Drafts after a successful high-priority `website-form.json` test in mock mode.

## Daily Summary Fails

Checks:

- `DAILY_SUMMARY_RECIPIENT`
- Google Sheets credential read access for `Leads` and `ErrorLogs`
- Gmail credential email sending permission
- Date fields in valid ISO date string format

Manual workflow execution precedes schedule activation.

## Schema Validation Fails

Tests:

```sh
pnpm test
```

Inspect the relevant schema:

```text
schemas/lead-input.schema.json
schemas/normalized-lead.schema.json
schemas/qualify-lead-request.schema.json
schemas/ai-qualification-output.schema.json
schemas/crm-record.schema.json
schemas/error-log.schema.json
schemas/api-error.schema.json
```

Update examples and tests together with schema changes.

## Formatting Fails

Commands:

```sh
pnpm format
pnpm format:check
```

Check whitespace:

```sh
git diff --check
```

## Pre-commit Fails

Read the hook output.

Fix the reported staged files.

Run:

```sh
pnpm check:precommit
```
