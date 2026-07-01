# Schemas

Schemas are the source of truth for payload contracts.

## Schema Files

| Schema                                        | Purpose                                             |
| --------------------------------------------- | --------------------------------------------------- |
| `schemas/lead-input.schema.json`              | Raw webhook payloads used by examples.              |
| `schemas/normalized-lead.schema.json`         | Normalized lead sent to AI Gateway.                 |
| `schemas/qualify-lead-request.schema.json`    | AI Gateway qualification request wrapper.           |
| `schemas/ai-qualification-output.schema.json` | Provider-neutral AI output.                         |
| `schemas/crm-record.schema.json`              | CRM row shape built from lead and AI output fields. |
| `schemas/error-log.schema.json`               | Workflow error log rows.                            |
| `schemas/api-error.schema.json`               | Structured API error responses.                     |

## Raw Lead Input

Sources:

```text
website_form
facebook_ad
missed_call_transcript
```

Allowed raw fields:

```text
source
name
email
phone
company
message
transcript
campaign
language
external_id
```

## Normalized Lead

Required fields:

```text
lead_id
source
received_at
contact
content
metadata
raw_input
```

Required contact method, at least one:

```text
contact.email
contact.phone
```

Required content field, at least one:

```text
content.message
content.transcript
```

## AI Output

AI output validation precedes downstream workflow actions.

Output rejection conditions:

- `lead_score` is missing
- `lead_score` is outside `0` to `100`
- `priority` is not `High`, `Medium`, or `Low`
- Required CRM fields are missing
- Additional fields appear where schemas disallow them

## CRM Record

Build CRM records from:

- Normalized lead contact fields
- AI qualification output
- AI CRM fields
- Draft output fields
- Booking link
- Processing status

`Leads` tab schema: CRM schema.

## Error Log

Capture:

```text
error_id
lead_id
timestamp
workflow_name
node_name
error_code
error_message
status
raw_input
raw_ai_output
```

`raw_input` and `raw_ai_output`: redacted serialized JSON strings. Excluded content: contact details, message bodies, transcripts, email drafts, and SMS draft bodies.

Status values: `FAILED` for critical failures, `WARNING` for non-critical sink failures.

## Update Rules

Schema change checklist:

1. Update the JSON Schema file
2. Update examples under `examples/inputs/` and `examples/outputs/`
3. Update workflow mappings that write Google Sheets rows
4. Update TypeScript types in `apps/ai-gateway/src/types.ts` when the runtime shape changes
5. Update Ajv validator tests under `apps/ai-gateway/tests/`
6. Validation commands

```sh
pnpm test
pnpm format:check
git diff --check
```
