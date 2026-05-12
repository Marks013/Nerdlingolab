#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/Nerdlingolab}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
BASE_URL="${DROPSHIPPING_CRON_BASE_URL:-http://127.0.0.1:3001}"
LIMIT="${DROPSHIPPING_CRON_LIMIT:-100}"
LOG_FILE="${DROPSHIPPING_CRON_LOG:-/tmp/nerdlingolab-dropshipping-cron.out}"
ERR_FILE="${DROPSHIPPING_CRON_ERR:-/tmp/nerdlingolab-dropshipping-cron.err}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

TOKEN="${CRON_SECRET:-${AUTH_SECRET:-${NEXTAUTH_SECRET:-}}}"

if [[ -z "$TOKEN" ]]; then
  echo "$(date -Is) CRON_SECRET/AUTH_SECRET ausente" >> "$ERR_FILE"
  exit 1
fi

curl -fsS \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/cron/dropshipping?limit=$LIMIT" \
  >> "$LOG_FILE" 2>> "$ERR_FILE"
echo >> "$LOG_FILE"
