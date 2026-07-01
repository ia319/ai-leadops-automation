# Error Handling

Structured errors support failure diagnosis without raw n8n execution data.

## Error Codes

Error codes:

```text
INVALID_INPUT
MISSING_CONTACT_METHOD
MISSING_MESSAGE_CONTENT
UNSUPPORTED_SOURCE
AI_GATEWAY_FAILED
AI_PROVIDER_FAILED
AI_PARSE_FAILED
AI_SCHEMA_VALIDATION_FAILED
CRM_WRITE_FAILED
SLACK_NOTIFY_FAILED
GMAIL_DRAFT_FAILED
UNKNOWN_ERROR
```

## Validation Errors

Main workflow validation happens before AI Gateway calls.

Return a webhook error response when:

- unsupported `source`
- missing `contact.email` and `contact.phone`
- missing `content.message` and `content.transcript`

`ErrorLogs` row precedes webhook response.

## AI Gateway Errors

AI Gateway HTTP node setting: continue on failure.

Convert failed gateway responses into:

```json
{
  "status": "error",
  "error": {
    "code": "AI_GATEWAY_FAILED",
    "message": "AI Gateway request failed."
  }
}
```

AI Gateway error stops downstream CRM, Slack, Gmail, SMS, booking, and success log actions.

## AI Schema Errors

AI output validation precedes CRM record creation.

Schema validation failure target: `ErrorLogs` with redacted serialized AI output.

Webhook caller response code: `AI_SCHEMA_VALIDATION_FAILED`.

## Sink Errors

Sink error severity:

| Sink                          | Severity     | Behavior                                                      |
| ----------------------------- | ------------ | ------------------------------------------------------------- |
| Google Sheets `Leads`         | Critical     | Workflow stop; runtime failure captured by the error handler. |
| Google Sheets `ExecutionLogs` | Critical     | Workflow stop; runtime failure captured by the error handler. |
| Google Sheets `ErrorLogs`     | Critical     | Workflow stop; error state not recordable.                    |
| Slack notification            | Warning      | Workflow continuation with `SLACK_NOTIFY_FAILED` warning.     |
| Gmail draft                   | Warning      | Workflow continuation with `GMAIL_DRAFT_FAILED` warning.      |
| SMS draft                     | Non-external | Text draft only; no SMS sending.                              |

## Error Handler Workflow

Runtime failure workflow: `workflows/n8n/leadops-error-handler.workflow.json`.

Capture:

- workflow name
- node name
- error code
- error message
- execution context
- lead ID when available
- redacted serialized input and AI output when available

Error output target: `ErrorLogs`.

Critical failure notification target: Slack. Slack alert branch source: extracted execution context. `ErrorLogs` write failure impact: no Slack alert blockage.

## Verification

Invalid payload request:

```sh
curl -sS -X POST "http://localhost:5678/webhook-test/leadops-main" \
  -H "Content-Type: application/json" \
  --data-binary @examples/inputs/invalid-input.json
```

Expected result:

- Response: `status: error`
- `ErrorLogs`: one new row with redacted diagnostic fields
- `Leads`: no new row
- Slack and Gmail: no alert or draft
