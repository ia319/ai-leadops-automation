# Workflow Reference

n8n workflow behavior and external dependency reference.

## Demo Workflow

Import:

```text
workflows/n8n/leadops-demo.workflow.json
```

Credential-free workflow. Simulates AI Gateway output, CRM output, Slack alert, Gmail draft, SMS draft, and booking link behavior.

Node path:

```text
Webhook Trigger
Normalize Lead
Validate Lead
Mock AI Gateway Response
Validate AI Output
Build CRM Record
Mock Slack Alert
Mock Gmail Draft
Mock SMS Draft
Attach Booking Link
Build Final Response
Respond to Webhook
```

Demo workflow purpose: raw input handling verification before external service configuration.

Demo workflow is not the production delivery path. It simulates CRM, Slack, Gmail, SMS, and booking outputs without external service calls.

## Main Workflow

Import:

```text
workflows/n8n/leadops-main.workflow.json
```

Main workflow prerequisites: AI Gateway, Google Sheets, Slack, and Gmail.

Primary delivery workflow.

Node path:

```text
Webhook Trigger
Normalize Lead
Validate Lead
Route Valid Lead
HTTP Request: AI Gateway /v1/qualify-lead
Validate AI Output
Route AI Success
Build CRM Record
Append Google Sheets Row
Route by Lead Score
Send Slack Alert
Route by Email
Create Gmail Draft
Generate SMS Draft
Attach Booking Link
Append Success Log
Respond to Webhook
Append Error Log Row
Respond Error
```

Behaviors:

- `Leads`: one row per valid lead after AI validation
- Slack: only when `lead_score >= 75`
- Gmail: draft only when the lead has an email
- SMS: draft text only when the lead has a phone
- `BOOKING_LINK`: only when intent is `Book Consultation`
- `ExecutionLogs`: one row for successful processing
- `ErrorLogs`: one row for validation and AI errors with redacted diagnostic fields

Dependencies:

- AI Gateway URL: `AI_GATEWAY_URL`
- Google Sheet document ID: `GOOGLE_SHEETS_DOCUMENT_ID`
- Google Sheet tabs: `Leads`, `ExecutionLogs`, and `ErrorLogs`
- Google Sheets OAuth2 credentials on all Google Sheets nodes
- Slack OAuth2 credentials on Slack nodes
- Gmail OAuth2 credentials on Gmail nodes
- Slack channel ID: `SLACK_CHANNEL_ID`, not `#channel-name`

Slack incoming webhook is not part of the exported main workflow. Slack OAuth2 is the default. Incoming webhook requires replacing the Slack node with an HTTP Request node.

## Error Handler Workflow

Import:

```text
workflows/n8n/leadops-error-handler.workflow.json
```

Purpose: runtime failures that stop workflow execution, including critical sink failures.

Node path:

```text
Error Trigger
Extract Execution Context
  -> Append Error Log Row
  -> Send Critical Failure Notification
```

Error handler binding belongs in n8n workflow settings where needed.

## Daily Summary Workflow

Import:

```text
workflows/n8n/leadops-daily-summary.workflow.json
```

Daily email contents:

- Total leads
- Priority breakdown
- Error totals and error breakdown
- Pending follow-ups
- Top sources
- High-priority lead list

Node path:

```text
Schedule Trigger
Read Leads
Read ErrorLogs
Calculate Metrics
Build Summary Email
Send Summary Email
```

Required before workflow activation: `DAILY_SUMMARY_RECIPIENT`.

## Webhook URLs

Test URLs apply only while a workflow waits for manual test execution. n8n registers a `webhook-test` URL for one request after **Execute workflow**.

```text
http://localhost:5678/webhook-test/leadops-demo
http://localhost:5678/webhook-test/leadops-main
```

Production URLs apply after workflow activation. These URLs handle repeated requests:

```text
http://localhost:5678/webhook/leadops-demo
http://localhost:5678/webhook/leadops-main
```

`webhook-test`: credential configuration and node debugging. Workflow activation follows successful manual execution.
