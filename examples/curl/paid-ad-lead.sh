#!/usr/bin/env sh
set -eu

: "${WEBHOOK_URL:?Set WEBHOOK_URL to the n8n webhook URL}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

curl --fail-with-body -sS -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  --data-binary "@$SCRIPT_DIR/../inputs/paid-ad-lead.json"
