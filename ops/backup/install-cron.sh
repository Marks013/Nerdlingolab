#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/Nerdlingolab}"
CRON_SCHEDULE="${BACKUP_CRON_SCHEDULE:-17 3 * * *}"
CRON_MARKER="# nerdlingolab automated backup"
CRON_COMMAND="cd ${PROJECT_DIR} && docker compose --profile backup run --rm backup-runner >> /srv/nerdlingolab/migration-backups/backup-cron.log 2>&1"

current_cron="$(mktemp)"
new_cron="$(mktemp)"
trap 'rm -f "$current_cron" "$new_cron"' EXIT

crontab -l >"$current_cron" 2>/dev/null || true
grep -vF "$CRON_MARKER" "$current_cron" >"$new_cron" || true
printf '%s %s %s\n' "$CRON_SCHEDULE" "$CRON_COMMAND" "$CRON_MARKER" >>"$new_cron"
crontab "$new_cron"

printf 'Installed cron: %s %s\n' "$CRON_SCHEDULE" "$CRON_COMMAND"
