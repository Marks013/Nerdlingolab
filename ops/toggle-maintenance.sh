#!/usr/bin/env sh

set -eu

MODE="${1:-}"
ENV_FILE="${ENV_FILE:-./.env}"
SERVICE_NAME="${SERVICE_NAME:-app}"
TOKEN_KEY="MAINTENANCE_BYPASS_TOKEN"

if [ -z "$MODE" ]; then
  echo "Uso: ./ops/toggle-maintenance.sh [on|off]"
  exit 1
fi

detect_compose_cmd() {
  if docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi

  if sudo docker info >/dev/null 2>&1 && sudo docker compose version >/dev/null 2>&1; then
    echo "sudo docker compose"
    return
  fi

  if docker info >/dev/null 2>&1 && command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return
  fi

  if sudo docker info >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1 && sudo docker-compose version >/dev/null 2>&1; then
    echo "sudo docker-compose"
    return
  fi

  echo "Docker Compose nao esta disponivel no host." >&2
  exit 1
}

generate_bypass_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi

  date +%s | sha256sum | awk '{ print $1 }'
}

set_env_value() {
  key="$1"
  value="$2"
  tmp_file="$(mktemp)"

  if [ -f "$ENV_FILE" ] && grep -q "^${key}=" "$ENV_FILE"; then
    awk -v key="$key" -v value="$value" '
      $0 ~ "^" key "=" {
        print key "=" value
        next
      }
      { print }
    ' "$ENV_FILE" > "$tmp_file"
  else
    [ -f "$ENV_FILE" ] && cat "$ENV_FILE" > "$tmp_file"
    printf '\n%s=%s\n' "$key" "$value" >> "$tmp_file"
  fi

  mv "$tmp_file" "$ENV_FILE"
}

read_env_value() {
  key="$1"
  [ -f "$ENV_FILE" ] || return 0
  grep "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d "=" -f 2- | tr -d '"'
}

mkdir -p "$(dirname "$ENV_FILE")"
[ -f "$ENV_FILE" ] || : > "$ENV_FILE"

case "$MODE" in
  on)
    echo "Ativando manutencao da NerdLingoLab..."
    set_env_value "MAINTENANCE_MODE" "true"
    token="$(read_env_value "$TOKEN_KEY")"
    if [ -z "$token" ]; then
      token="$(generate_bypass_token)"
      set_env_value "$TOKEN_KEY" "$token"
    fi
    ;;
  off)
    echo "Desativando manutencao da NerdLingoLab..."
    set_env_value "MAINTENANCE_MODE" "false"
    token="$(read_env_value "$TOKEN_KEY")"
    ;;
  *)
    echo "Argumento invalido. Use 'on' ou 'off'."
    exit 1
    ;;
esac

compose_cmd="$(detect_compose_cmd)"

echo "Recriando ${SERVICE_NAME} para recarregar ambiente..."
$compose_cmd up -d --no-deps --force-recreate "$SERVICE_NAME"

echo "Modo manutencao atualizado."
if [ "$MODE" = "on" ] && [ -n "${token:-}" ]; then
  echo "Bypass auditoria: X-NerdLingoLab-Maintenance-Bypass: ${token}"
fi
