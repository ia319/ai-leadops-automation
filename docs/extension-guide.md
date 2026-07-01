# Extension Guide

Extension rules for new inputs, providers, sinks, and workflow outputs. Existing contracts remain stable.

## Input Source Extension

Files:

```text
schemas/lead-input.schema.json
schemas/normalized-lead.schema.json
workflows/n8n/leadops-demo.workflow.json
workflows/n8n/leadops-main.workflow.json
examples/inputs/
apps/ai-gateway/tests/schema-validation.test.ts
apps/ai-gateway/tests/json-schema-validator.test.ts
```

Source enum value addition.

n8n normalization logic update.

Examples: at least one valid raw example and one normalized example when needed.

Checks:

```sh
pnpm test
pnpm format:check
```

## AI Provider Extension

Provider adapter:

```text
apps/ai-gateway/src/providers/<provider>.ts
```

Interface: `AIProvider`; return type: `AIProviderResult`.

Update:

```text
apps/ai-gateway/src/config.ts
apps/ai-gateway/src/providers/index.ts
```

`.env.example` provider variables.

Provider output validation: `validateAIQualificationOutput`.

n8n workflow JSON remains unchanged.

## CRM Sink Extension

Row contract: `schemas/crm-record.schema.json`.

Sink node location: after `Build CRM Record`.

Treat CRM write failures as critical unless the record is also written to another durable system.

Credentialed sink changes require setup and configuration doc updates.

## Notification Sink Extension

Notification node location: after lead score routing.

Notification send condition required.

Optional notifications are warnings.

Non-critical notification failure target: `ExecutionLogs` warning record.

## SMS Provider Extension

Default SMS behavior: draft output.

Provider node prerequisite: explicit opt-in and compliance checks.

Default workflow: no automatic SMS sending.

Document the provider credentials and failure behavior.

## Calendar Provider Extension

Simple default: `BOOKING_LINK`.

Calendar API behavior only for dynamic slot requirements.

Booking links as data, not hard-coded provider adapter text.

## Voice Adapter Extension

Call transcripts convert into raw lead payloads.

New `source` enum value requires schema and normalization updates.

Transcript text location: `content.transcript`.

## Update Documentation

Docs affected by extensions:

```text
docs/configuration.md
docs/development/architecture.md
docs/workflow-reference.md
docs/schemas.md
docs/testing.md
docs/troubleshooting.md
```

Checks:

```sh
pnpm format:check
git diff --check
```
