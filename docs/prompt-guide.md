# Prompt Guide

Shared lead qualification prompt and provider adapter rules. Supported providers: deterministic `mock`, official `openai`, official `anthropic`, and generic `openai-compatible`.

## Output Rule

Model output requirement: valid JSON only. No markdown, commentary, code fences, or extra prose.

Output contract:

```text
AIQualificationOutput
```

Source of truth: `schemas/ai-qualification-output.schema.json`.

Official OpenAI and Anthropic adapters send a provider-safe schema derived from that JSON Schema through provider structured-output fields. The OpenAI-compatible adapter includes the full schema in the prompt because generic compatible endpoints do not consistently support strict schema parameters.

## Required Fields

Required fields:

```text
lead_summary
lead_type
intent
priority
lead_score
service_requested
pain_point
recommended_next_step
needs_human_followup
suggested_email_reply
suggested_sms_reply
crm_fields
```

Unknown optional values: `null`.

## Enum Values

Exact enum values only.

`lead_type` values:

```text
Sales Inquiry
Support Request
Partnership
Spam
Other
```

`intent` values:

```text
Book Consultation
Request Quote
Ask Question
Follow Up
Other
```

`priority` values:

```text
High
Medium
Low
```

`crm_fields.pipeline_stage` values:

```text
New Lead
New Qualified Lead
Human Review
Low Priority
Spam
```

`crm_fields.follow_up_status` values:

```text
Draft Created
Needs Review
No Action
```

## Scoring Rules

`lead_score` range: `0` to `100`.

Scoring guide:

- Score `75` to `100` for clear buying intent, booking requests, quote requests, urgent needs, or direct callback requests
- Score `40` to `74` for general interest, questions, or unclear but plausible commercial intent
- Score `0` to `39` for spam, unsubscribe requests, irrelevant content, or missing buying intent

## Reply Rules

`suggested_sms_reply`: under `240` characters.

`suggested_email_reply`: under `120` words.

Unavailable services: no promises.

Ask for missing context when the lead intent is unclear.

## Adapter Checks

Provider output validation precedes gateway return.

Reject malformed JSON with `AI_PARSE_FAILED`.

Reject schema mismatches with `AI_SCHEMA_VALIDATION_FAILED`.

Provider structured outputs are the first guard. Local Ajv validation is the final guard.

n8n remains unchanged during prompt or provider changes.
