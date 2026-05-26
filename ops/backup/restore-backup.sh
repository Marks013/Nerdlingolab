#!/usr/bin/env bash

set -Eeuo pipefail

log() {
  printf '[restore] %s\n' "$*"
}

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    log "Missing required environment variable: ${key}"
    exit 1
  fi
}

latest_local_backup() {
  local archive
  archive="$(find /backups/archives -type f -name '*.tar.gz.enc' | sort | tail -n 1)"
  if [[ -z "$archive" ]]; then
    log "No local encrypted backups were found in /backups/archives."
    exit 1
  fi
  printf '%s' "$archive"
}

verify_checksum() {
  local expected actual
  expected="$(tr -d '[:space:]' <"$CHECKSUM_SOURCE_PATH")"
  actual="$(sha256sum "$ARCHIVE_SOURCE_PATH" | awk '{print $1}')"

  if [[ "$expected" != "$actual" ]]; then
    log "Checksum mismatch for ${ARCHIVE_SOURCE_PATH}"
    exit 1
  fi
}

decrypt_and_extract() {
  require_env BACKUP_ENCRYPTION_PASSPHRASE

  DECRYPTED_ARCHIVE="${WORK_ROOT}/payload.tar.gz"
  EXTRACT_ROOT="${WORK_ROOT}/payload"

  log "Decrypting archive"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
    -in "$ARCHIVE_SOURCE_PATH" \
    -out "$DECRYPTED_ARCHIVE" \
    -pass env:BACKUP_ENCRYPTION_PASSPHRASE

  mkdir -p "$EXTRACT_ROOT"
  log "Extracting payload"
  tar -xzf "$DECRYPTED_ARCHIVE" -C "$EXTRACT_ROOT"

  DATABASE_DUMP_PATH="${EXTRACT_ROOT}/database.sql"
  MINIO_ARCHIVE_PATH="${EXTRACT_ROOT}/minio-data.tar.gz"
  CRITICAL_FILES_PATH="${EXTRACT_ROOT}/critical-files.tar.gz"

  if [[ ! -f "$DATABASE_DUMP_PATH" ]]; then
    log "The decrypted payload is incomplete. database.sql was not found."
    exit 1
  fi
}

restore_database() {
  local mode="${RESTORE_MODE:-test}"
  local db_name="${POSTGRES_DB:-nerdlingolab}"
  local restore_db_name target_label

  if [[ "$mode" == "prod" ]]; then
    if [[ "${RESTORE_PRODUCTION_CONFIRMATION:-}" != "RESTORE_NERDLINGOLAB_PROD" ]]; then
      log "Production restore requires RESTORE_PRODUCTION_CONFIRMATION=RESTORE_NERDLINGOLAB_PROD."
      exit 1
    fi
    restore_db_name="${RESTORE_TARGET_DB:-$db_name}"
    target_label="production"
  else
    restore_db_name="${RESTORE_TARGET_DB:-${db_name}_restore_test}"
    target_label="test"
  fi

  log "Recreating ${target_label} restore database '${restore_db_name}'"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${restore_db_name}' AND pid <> pg_backend_pid();" \
    -c "DROP DATABASE IF EXISTS \"${restore_db_name}\";" \
    -c "CREATE DATABASE \"${restore_db_name}\";" >/dev/null

  log "Restoring database SQL into '${restore_db_name}'"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$restore_db_name" -v ON_ERROR_STOP=1 <"$DATABASE_DUMP_PATH" >/dev/null

  log "Database restore completed for '${restore_db_name}'"
}

extract_files_for_review() {
  mkdir -p /backups/restore-output

  if [[ -f "$MINIO_ARCHIVE_PATH" ]]; then
    log "Extracting MinIO archive to /backups/restore-output"
    tar -xzf "$MINIO_ARCHIVE_PATH" -C /backups/restore-output
  fi

  if [[ -f "$CRITICAL_FILES_PATH" ]]; then
    log "Extracting critical files to /backups/restore-output/critical-files"
    mkdir -p /backups/restore-output/critical-files
    tar -xzf "$CRITICAL_FILES_PATH" -C /backups/restore-output/critical-files
  fi
}

export TZ="${TZ:-America/Sao_Paulo}"

DB_HOST="${BACKUP_DB_HOST:-postgres}"
DB_PORT="${BACKUP_DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-nerdlingolab}"
DB_USER="${POSTGRES_USER:-nerdlingolab}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

require_env POSTGRES_PASSWORD
export PGPASSWORD="$DB_PASSWORD"

WORK_ROOT="/tmp/nerdlingolab-restore-$(date '+%Y%m%d-%H%M%S')"
trap 'rm -rf "$WORK_ROOT"' EXIT
mkdir -p "$WORK_ROOT"

ARCHIVE_SOURCE_PATH="${RESTORE_ARCHIVE_PATH:-}"
if [[ -z "$ARCHIVE_SOURCE_PATH" ]]; then
  ARCHIVE_SOURCE_PATH="$(latest_local_backup)"
fi
CHECKSUM_SOURCE_PATH="${RESTORE_CHECKSUM_PATH:-${ARCHIVE_SOURCE_PATH%.tar.gz.enc}.sha256}"

if [[ ! -f "$ARCHIVE_SOURCE_PATH" ]]; then
  log "Restore archive not found: ${ARCHIVE_SOURCE_PATH}"
  exit 1
fi
if [[ ! -f "$CHECKSUM_SOURCE_PATH" ]]; then
  log "Restore checksum not found: ${CHECKSUM_SOURCE_PATH}"
  exit 1
fi

verify_checksum
decrypt_and_extract
restore_database
extract_files_for_review

log "Restore validation completed."
