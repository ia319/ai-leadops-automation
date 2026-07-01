# Configuration

Environment variables control runtime behavior. Secrets stay outside the repository. n8n OAuth credentials stay inside n8n.

## AI Gateway Variables

| Variable         | Scope    | Default              | Purpose                                                                          |
| ---------------- | -------- | -------------------- | -------------------------------------------------------------------------------- |
| `PORT`           | Optional | `8787`               | AI Gateway HTTP port.                                                            |
| `LOG_LEVEL`      | Optional | `info`               | Runtime log level.                                                               |
| `AI_PROVIDER`    | Optional | `mock`               | Provider selector: `mock`, `openai`, `anthropic`, or `openai-compatible`.        |
| `AI_MODEL`       | Optional | `demo-leadops-model` | Mock provider model label. Real providers use provider-specific model variables. |
| `AI_TEMPERATURE` | Optional | `0.2`                | Sampling temperature for supported OpenAI and OpenAI-compatible models.          |
| `AI_MAX_TOKENS`  | Optional | `1200`               | Provider output token limit.                                                     |
| `AI_TIMEOUT_MS`  | Optional | `30000`              | Provider request timeout in milliseconds.                                        |
| `AI_RETRY_COUNT` | Optional | `2`                  | Total request attempts. SDK providers use `maxRetries = AI_RETRY_COUNT - 1`.     |

## Provider Variables

| Variable                     | Scope               | Purpose                               |
| ---------------------------- | ------------------- | ------------------------------------- |
| `OPENAI_API_KEY`             | `openai`            | Official OpenAI API key.              |
| `OPENAI_MODEL`               | `openai`            | Official OpenAI Responses API model.  |
| `ANTHROPIC_API_KEY`          | `anthropic`         | Anthropic API key.                    |
| `ANTHROPIC_MODEL`            | `anthropic`         | Anthropic Messages API model.         |
| `OPENAI_COMPATIBLE_API_KEY`  | `openai-compatible` | OpenAI-compatible bearer token.       |
| `OPENAI_COMPATIBLE_BASE_URL` | `openai-compatible` | API root base URL, for example `/v1`. |
| `OPENAI_COMPATIBLE_MODEL`    | `openai-compatible` | OpenAI-compatible model name.         |

Gateway validation uses Ajv and JSON Schema files in `schemas/`.

## n8n Workflow Variables

| Variable                    | Scope                              | Purpose                                                                       |
| --------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `AI_GATEWAY_URL`            | Main workflow                      | AI Gateway URL. Docker Desktop n8n value: `http://host.docker.internal:8787`. |
| `GOOGLE_SHEETS_DOCUMENT_ID` | Main, error handler, daily summary | CRM and log workbook document ID.                                             |
| `SLACK_CHANNEL_ID`          | Slack notifications                | Target Slack channel ID.                                                      |
| `DAILY_SUMMARY_RECIPIENT`   | Daily summary                      | Summary email recipient.                                                      |
| `BOOKING_LINK`              | Optional booking link              | Booking link for AI output intent `Book Consultation`.                        |

Self-hosted n8n needs `--env-file .env` for workflow environment access. Container recreation is required after `.env` changes that n8n must read.

Allow n8n expressions to read environment variables:

```text
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

Main workflow environment references: `$env.GOOGLE_SHEETS_DOCUMENT_ID`, `$env.SLACK_CHANNEL_ID`, `$env.AI_GATEWAY_URL`, and `$env.BOOKING_LINK`. Blocked environment access causes `access to env vars denied`.

Docker command for local validation:

```powershell
docker run -d --name n8n -p 5678:5678 --env-file .env -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n:2.25.4
```

Pinned n8n image tag required for reproducible validation. No untagged image.

## Required n8n Credentials

Required n8n credentials:

| Credential           | Used By                                      | Permissions                                                                                 |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Google Sheets OAuth2 | Main, error handler, daily summary workflows | Read `Leads`, read `ErrorLogs`, append `Leads`, append `ExecutionLogs`, append `ErrorLogs`. |
| Slack OAuth2         | Main and error handler workflows             | Post messages to the configured channel.                                                    |
| Gmail OAuth2         | Main and daily summary workflows             | Draft creation and summary email sending.                                                   |

Credential verification follows workflow import. No credential IDs, access tokens, refresh tokens, or personal account names in Git.

n8n credential auto-selection is possible after credential creation. Credential field confirmation applies to imported nodes. Manual selection applies to blank or wrong credential fields.

`Google Sheets OAuth2` nodes:

```text
Append Google Sheets Row
Append Success Log
Append Error Log Row
Read Leads
Read ErrorLogs
```

`Slack OAuth2` nodes:

```text
Send Slack Alert
Send Critical Failure Notification
```

`Gmail OAuth2` nodes:

```text
Create Gmail Draft
Send Summary Email
```

Main workflow Gmail behavior: draft creation only. No automatic lead follow-up email sending.

## Google Sheets Tabs

Required tabs:

```text
Leads
ExecutionLogs
ErrorLogs
```

Bottom sheet tabs only. No tab names in column `A` inside a single tab.

Workflow mapping field names:

- `Leads`: CRM fields from `schemas/crm-record.schema.json`
- `ExecutionLogs`: status, provider, score, action flags, and warning fields
- `ErrorLogs`: fields from `schemas/error-log.schema.json`; redacted JSON-string diagnostics in `raw_input` and `raw_ai_output`

`Leads!A1` header:

```tsv
lead_id	received_at	source	name	email	phone	company	lead_type	intent	priority	lead_score	service_requested	pain_point	lead_summary	recommended_next_step	pipeline_stage	follow_up_status	email_draft	sms_draft	booking_link	status	error_code
```

`ExecutionLogs!A1` header:

```tsv
timestamp	lead_id	workflow_name	status	provider	model	priority	lead_score	crm_record_created	slack_alert_sent	gmail_draft_created	sms_draft_created	booking_link_attached	warning_count	warnings
```

`ErrorLogs!A1` header:

```tsv
error_id	lead_id	timestamp	workflow_name	node_name	error_code	error_message	status	raw_input	raw_ai_output
```

## Local `.env`

`.env` creation:

```sh
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

`.env` must stay untracked. Git ignore check:

```sh
git status --short -- .env
```
