# Setup

Local setup for AI Gateway, n8n, workflow import, credential confirmation, and main lead intake verification.

Fake test data only during setup. No personal leads, real customer data, or production credentials.

## Prerequisites

Install these tools:

- Node.js 20 or newer
- pnpm 9
- Docker Desktop
- curl
- A Google account for Google Sheets and Gmail
- A Slack workspace where you can install an app

Pinned n8n Docker image for repeatable validation. No untagged `latest` image. Validated tag:

```text
docker.n8n.io/n8nio/n8n:2.25.4
```

Newer n8n image tag changes require release-date verification.

Official references for credential failures:

- n8n Google OAuth2 single service credentials: <https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/>
- n8n Slack credentials: <https://docs.n8n.io/integrations/builtin/credentials/slack/>
- n8n security environment variables: <https://docs.n8n.io/hosting/configuration/environment-variables/security/>
- n8n Google Sheets node: <https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/>

## Install Dependencies

Install workspace dependencies:

```sh
pnpm install --frozen-lockfile
```

Local environment file:

```sh
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

`.env` stays untracked. No API keys, OAuth secrets, Slack webhook URLs, Google document IDs, or personal account names in Git.

## Configure Local Values

Minimal local values in `.env`:

```env
# Optional values: mock, openai, anthropic, openai-compatible. Default: mock.
AI_PROVIDER=

# URL n8n uses to call the AI Gateway from Docker Desktop.
AI_GATEWAY_URL=http://host.docker.internal:8787

# Google Sheet document ID for Leads, ExecutionLogs, and ErrorLogs.
GOOGLE_SHEETS_DOCUMENT_ID=

# Slack channel ID for high-priority lead alerts.
SLACK_CHANNEL_ID=

# Email recipient for the daily summary workflow.
DAILY_SUMMARY_RECIPIENT=

# Booking URL for lead intent Book Consultation.
BOOKING_LINK=https://calendly.com/demo/intro-call
```

Port reference:

- `8787`: AI Gateway HTTP port.
- `5678`: n8n web UI and webhook port.

`http://localhost:8787`: host-based n8n only. `http://host.docker.internal:8787`: Docker Desktop n8n.

Blank values depend on the Google Sheet, Slack channel, and Gmail recipient.

Optional values can stay at defaults:

| Variable         | Default              | Purpose                                      |
| ---------------- | -------------------- | -------------------------------------------- |
| `PORT`           | `8787`               | AI Gateway HTTP port.                        |
| `LOG_LEVEL`      | `info`               | Runtime log level.                           |
| `AI_MODEL`       | `demo-leadops-model` | Mock provider model label.                   |
| `AI_TEMPERATURE` | `0.2`                | Sampling control for supported real models.  |
| `AI_MAX_TOKENS`  | `1200`               | Provider output token limit.                 |
| `AI_TIMEOUT_MS`  | `30000`              | Provider request timeout in milliseconds.    |
| `AI_RETRY_COUNT` | `2`                  | Retry count for temporary provider failures. |

## AI Gateway Startup

Gateway command:

```sh
pnpm dev
```

Health check:

```sh
curl http://localhost:8787/health
```

Expected response:

```json
{
  "status": "ok",
  "provider": "mock"
}
```

Qualify a normalized lead:

```sh
curl -sS http://localhost:8787/v1/qualify-lead \
  -H "Content-Type: application/json" \
  --data-binary @examples/inputs/website-form-normalized.json
```

Expected fields: `provider`, `model`, `output`, and `usage`.

## n8n Docker Startup

Persistent volume:

```powershell
docker volume create n8n_data
```

n8n container:

```powershell
docker run -d --name n8n -p 5678:5678 --env-file .env -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n:2.25.4
```

`--env-file .env` gives n8n access to `AI_GATEWAY_URL`, `GOOGLE_SHEETS_DOCUMENT_ID`, `SLACK_CHANNEL_ID`, and `BOOKING_LINK`.

`N8N_BLOCK_ENV_ACCESS_IN_NODE=false` allows workflow expressions such as `$env.GOOGLE_SHEETS_DOCUMENT_ID` to read environment variables. n8n documents this security variable as the switch for environment variable access in expressions and Code nodes.

n8n URL:

```text
http://localhost:5678
```

Existing container startup:

```powershell
docker start n8n
```

Container recreation after `.env` changes required by n8n:

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

Only the container changes. Data remains in the `n8n_data` volume.

## Main Workflow Imports

Workflow imports after n8n startup:

```text
workflows/n8n/leadops-main.workflow.json
workflows/n8n/leadops-error-handler.workflow.json
workflows/n8n/leadops-daily-summary.workflow.json
```

Imported nodes may show missing credential warnings until Google, Slack, and Gmail setup is complete. Main workflow activation comes after test success.

## Google Sheet

One Google Sheet acts as the lightweight CRM and log workbook.

Rename the first bottom tab to:

```text
Leads
```

Additional bottom tabs:

```text
ExecutionLogs
ErrorLogs
```

`Leads`, `ExecutionLogs`, and `ErrorLogs` are bottom tab names, not values in column `A` of one tab.

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

`raw_input` and `raw_ai_output`: redacted JSON strings for diagnostics.

Single-cell paste fix: split text to columns with tab as the separator.

Document ID location:

```text
https://docs.google.com/spreadsheets/d/<document-id>/edit
```

Set:

```env
GOOGLE_SHEETS_DOCUMENT_ID=<document-id>
```

n8n container recreation required after `.env` edits.

## Google OAuth Credentials

Self-hosted n8n requires custom Google OAuth2. n8n Cloud managed OAuth is unavailable for self-hosted instances.

Google Sheets credential:

1. Open n8n.
2. Go to **Credentials**.
3. Select **Add credential**.
4. Search for `Google Sheets OAuth2`.
5. Copy the OAuth Redirect URL from n8n.
6. Open Google Cloud Console.
7. Create or select a project.
8. Enable `Google Sheets API`.
9. Enable `Google Drive API`. n8n documents that Google Sheets requires Google Drive API too.
10. Configure the OAuth consent screen.
11. Add your Google account as a test user when the app is in external testing mode.
12. Create an OAuth client with application type `Web application`.
13. Paste the exact n8n OAuth Redirect URL into Authorized redirect URIs.
14. Copy the Client ID and Client Secret into n8n.
15. Select **Sign in with Google** in n8n.
16. Save the credential.

Gmail credential, same Google Cloud project:

1. Enable `Gmail API`.
2. Create or reuse a web OAuth client.
3. Add the n8n OAuth Redirect URL.
4. Add your test user when using external testing mode.
5. Create `Gmail OAuth2` in n8n.
6. Sign in with Google.
7. Save the credential.

`redirect_uri_mismatch` fix: exact n8n OAuth Redirect URL in Google Cloud Console.

## Slack OAuth Credentials

Main workflow Slack integration: Slack OAuth2. No Slack incoming webhook.

Slack app:

1. Open `https://api.slack.com/apps`.
2. Select **Create New App**.
3. Select **From scratch**.
4. Select the workspace.
5. Open **Basic Information**.
6. Copy the Client ID and Client Secret.
7. Create a `Slack OAuth2` credential in n8n.
8. Paste the Client ID and Client Secret.
9. Copy the OAuth Callback URL from n8n.
10. Open **OAuth & Permissions** in Slack.
11. Add the n8n OAuth Callback URL as a redirect URL.
12. Add bot scopes that allow channel lookup and message posting, including `chat:write` and `channels:read`.
13. Add `groups:read` when posting to private channels.
14. Install the app to the workspace.
15. Complete the OAuth connection in n8n.
16. Save the credential.

Channel ID, not channel name:

```env
SLACK_CHANNEL_ID=C0123456789
```

Channel ID location:

```text
https://app.slack.com/client/Txxxxxxx/C0123456789
```

Last URL segment equals the channel ID.

## Main Workflow Credentials

Credential confirmation happens inside each imported workflow. n8n credential auto-selection is possible after credential creation. Correct selected credentials can stay selected. Blank or wrong credential fields require manual selection.

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

Workflow save after credential confirmation.

## Test the Main Workflow

Test mode first:

1. Open `AI LeadOps Main`.
2. Click **Execute workflow**.
3. Send one request to the test webhook.

Request:

```powershell
curl.exe -sS -X POST "http://localhost:5678/webhook-test/leadops-main" -H "Content-Type: application/json" --data-binary "@examples/inputs/website-form.json"
```

Expected result:

- Response status: `success` or `success_with_warnings`
- `Leads`: one new row
- `ExecutionLogs`: one new row
- Slack: one high-priority lead alert
- Gmail: one draft when the lead has an email
- SMS: draft text only, no SMS sending

Invalid input:

1. Click **Execute workflow** again.
2. Send:

```powershell
curl.exe -sS -X POST "http://localhost:5678/webhook-test/leadops-main" -H "Content-Type: application/json" --data-binary "@examples/inputs/invalid-input.json"
```

Expected result:

- Response status: `error`
- `ErrorLogs`: one new row with redacted diagnostic fields
- `Leads`: no success row

Active mode only after test mode success:

```powershell
curl.exe -sS -X POST "http://localhost:5678/webhook/leadops-main" -H "Content-Type: application/json" --data-binary "@examples/inputs/website-form.json"
```

## Custom Data Input

The commands above send sample files. Real integrations call the active webhook with HTTP `POST`:

```text
http://localhost:5678/webhook/leadops-main
```

Required JSON fields:

- `source`: `website_form`, `facebook_ad`, or `missed_call_transcript`
- `email` or `phone`: at least one contact method
- `message` or `transcript`: lead message or call transcript

Optional fields:

- `lead_id`
- `received_at`
- `name`
- `company`
- `campaign`
- `language`
- `external_id`

Example payload:

```json
{
  "source": "website_form",
  "name": "Test Lead",
  "email": "lead@example.com",
  "phone": "+15551234567",
  "company": "Example Co",
  "message": "I want to automate appointment booking and follow-up.",
  "campaign": "homepage-form",
  "language": "en",
  "external_id": "form-123"
}
```

Custom file request:

```powershell
curl.exe -sS -X POST "http://localhost:5678/webhook/leadops-main" -H "Content-Type: application/json" --data-binary "@path\to\your-lead.json"
```

Different upstream field names require mapping before validation. Mapping location: `Normalize Lead` node in n8n, or upstream data in the compatible shape above.

## Capture Public Assets

Sanitized public assets:

```text
assets/n8n-workflow-overview.png
assets/main-workflow-run.gif
assets/google-sheets-leads.png
assets/slack-alert.png
assets/gmail-draft.png
assets/google-sheets-error-log.png
```

Values hidden or cropped before asset commits:

- API keys
- OAuth client secrets
- Google account email addresses
- Gmail addresses
- Slack workspace names that identify a real organization
- Slack user names and avatars
- Google Sheet document IDs
- Production webhook URLs

Fake lead data can remain visible.

## Developer Checks

Developer checks apply to repository file changes and commit preparation. They are not required for n8n workflow operation.

Commands:

```sh
pnpm format:check
pnpm lint
pnpm test
pnpm --filter ai-gateway build
git diff --check
```
