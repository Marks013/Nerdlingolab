#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_SERVICE="${APP_SERVICE:-app}"
SETUP_SERVICE="${SETUP_SERVICE:-setup}"
APP_IMAGE="${APP_IMAGE:-nerdlingolab-commerce-app:latest}"
APP_BASE_URL="${APP_BASE_URL:-http://127.0.0.1:${APP_HOST_PORT:-3001}}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/ready}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-120}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-4}"
RELEASE_PULL="${RELEASE_PULL:-true}"
SKIP_MAINTENANCE="${SKIP_MAINTENANCE:-false}"
KEEP_MAINTENANCE_ON_FAILURE="${KEEP_MAINTENANCE_ON_FAILURE:-true}"
STAMP="$(date -u +%Y%m%d%H%M%S)"
MANIFEST_DIR="${MANIFEST_DIR:-ops/releases}"
MANIFEST_PATH="${MANIFEST_DIR}/release-${STAMP}.env"

log() {
  printf '[release] %s\n' "$*"
}

fail() {
  log "$*"
  exit 1
}

detect_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi

  if sudo docker compose version >/dev/null 2>&1; then
    echo "sudo docker compose"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo docker-compose version >/dev/null 2>&1; then
    echo "sudo docker-compose"
    return
  fi

  fail "Docker Compose nao esta disponivel no host."
}

detect_docker_cmd() {
  if docker info >/dev/null 2>&1; then
    echo "docker"
    return
  fi

  if sudo docker info >/dev/null 2>&1; then
    echo "sudo docker"
    return
  fi

  fail "Docker nao esta disponivel no host."
}

read_env_value() {
  local key="$1"
  [[ -f .env ]] || return 0
  grep "^${key}=" .env | tail -n 1 | cut -d "=" -f 2- | tr -d '"'
}

wait_for_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local attempt=1

  while (( SECONDS < deadline )); do
    local response=""
    response="$(curl --silent --show-error --max-time 8 "${APP_BASE_URL}${HEALTH_PATH}" 2>&1 || true)"

    if [[ "$response" == *'"ok":true'* ]]; then
      log "Health ok em ${APP_BASE_URL}${HEALTH_PATH}"
      return 0
    fi

    if (( attempt == 1 || attempt % 4 == 0 )); then
      log "Aguardando health (${attempt}): ${response:0:180}"
      $COMPOSE_CMD logs --tail=10 "$APP_SERVICE" || true
    fi

    sleep "$HEALTH_INTERVAL_SECONDS"
    ((attempt++))
  done

  fail "Health nao confirmou dentro de ${HEALTH_TIMEOUT_SECONDS}s."
}

smoke_request() {
  local label="$1"
  local path="$2"
  local token="${3:-}"
  local status

  if [[ -n "$token" ]]; then
    status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
      -H "X-NerdLingoLab-Maintenance-Bypass: ${token}" "${APP_BASE_URL}${path}")"
  else
    status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "${APP_BASE_URL}${path}")"
  fi

  [[ "$status" =~ ^2|3 ]] || fail "Smoke ${label} falhou em ${path}: HTTP ${status}"
  log "Smoke ${label}: HTTP ${status}"
}

on_error() {
  log "Release falhou."
  if [[ "$SKIP_MAINTENANCE" != "true" && "$KEEP_MAINTENANCE_ON_FAILURE" != "true" ]]; then
    SERVICE_NAME="$APP_SERVICE" ./ops/toggle-maintenance.sh off || true
  else
    log "Manutencao mantida para proteger a loja."
  fi
  log "Manifesto: ${MANIFEST_PATH}"
}

trap on_error ERR

COMPOSE_CMD="$(detect_compose_cmd)"
DOCKER_CMD="$(detect_docker_cmd)"
mkdir -p "$MANIFEST_DIR"

rollback_tag=""
if $DOCKER_CMD image inspect "$APP_IMAGE" >/dev/null 2>&1; then
  rollback_tag="nerdlingolab-commerce-app:rollback-${STAMP}"
  $DOCKER_CMD tag "$APP_IMAGE" "$rollback_tag"
fi

{
  printf 'RELEASE_STARTED_AT=%s\n' "$STAMP"
  printf 'ROLLBACK_IMAGE_TAG=%s\n' "$rollback_tag"
  printf 'GIT_BEFORE=%s\n' "$(git rev-parse --short HEAD 2>/dev/null || true)"
} > "$MANIFEST_PATH"

if [[ "$SKIP_MAINTENANCE" != "true" ]]; then
  SERVICE_NAME="$APP_SERVICE" sh ./ops/toggle-maintenance.sh on
fi

if [[ "$RELEASE_PULL" == "true" ]]; then
  log "Atualizando repositorio..."
  git pull --ff-only
fi

log "Build setup/app..."
$COMPOSE_CMD build "$SETUP_SERVICE" "$APP_SERVICE"

log "Aplicando migrations..."
$COMPOSE_CMD run --rm --no-deps "$SETUP_SERVICE" npm run db:deploy

log "Subindo app..."
$COMPOSE_CMD up -d "$APP_SERVICE"
wait_for_health

bypass_token="$(read_env_value MAINTENANCE_BYPASS_TOKEN)"
smoke_request "home" "/" "$bypass_token"
smoke_request "cupons" "/cupons" "$bypass_token"
smoke_request "manutencao" "/manutencao"

if [[ "$SKIP_MAINTENANCE" != "true" ]]; then
  SERVICE_NAME="$APP_SERVICE" sh ./ops/toggle-maintenance.sh off
  wait_for_health
fi

{
  printf 'GIT_AFTER=%s\n' "$(git rev-parse --short HEAD 2>/dev/null || true)"
  printf 'RELEASE_FINISHED_AT=%s\n' "$(date -u +%Y%m%d%H%M%S)"
} >> "$MANIFEST_PATH"

log "Release concluida. Manifesto: ${MANIFEST_PATH}"
