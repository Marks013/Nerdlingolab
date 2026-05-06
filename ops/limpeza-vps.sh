#!/usr/bin/env bash
set -Eeuo pipefail

STARTED_AT="$(date '+%Y-%m-%d %H:%M:%S %Z')"
APP_DIR="${APP_DIR:-/home/ubuntu/Nerdlingolab}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-app}"
JOURNAL_MAX_SIZE="${JOURNAL_MAX_SIZE:-100M}"
BUILDER_UNTIL="${BUILDER_UNTIL:-168h}"
CONTAINER_UNTIL="${CONTAINER_UNTIL:-24h}"
MAX_AUTOREMOVE_PACKAGES="${MAX_AUTOREMOVE_PACKAGES:-25}"
PROTECTED_APT_REGEX="${PROTECTED_APT_REGEX:-(^| )(docker|docker-ce|docker-ce-cli|containerd|containerd.io|docker-compose-plugin|nginx|postgresql|mysql-server|mariadb-server|redis-server|nodejs|npm|pnpm|yarn|certbot|ufw|openssh-server|fail2ban|supervisor|pm2)( |$)}"

log() {
  printf '[limpeza-vps] %s\n' "$*"
}

warn() {
  printf '[limpeza-vps][aviso] %s\n' "$*" >&2
}

run() {
  log "$*"
  "$@"
}

if [[ "${EUID}" -ne 0 ]]; then
  log "Reexecutando com sudo para limpar Docker, journal e apt corretamente."
  exec sudo -E bash "$0" "$@"
fi

log "Iniciando limpeza segura: ${STARTED_AT}"

check_app() {
  if [[ -d "${APP_DIR}" ]] && command -v docker >/dev/null 2>&1; then
    (
      cd "${APP_DIR}"
      if docker compose ps "${COMPOSE_SERVICE}" >/dev/null 2>&1; then
        docker compose ps "${COMPOSE_SERVICE}" || true
      fi
    )
  fi
}

health_check() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS http://127.0.0.1:3001/api/health/ready >/dev/null 2>&1 \
      && log "Healthcheck local OK." \
      || warn "Healthcheck local nao respondeu em http://127.0.0.1:3001/api/health/ready."
  fi
}

log "Estado da aplicacao antes da limpeza:"
check_app
health_check

if command -v docker >/dev/null 2>&1; then
  log "Uso Docker antes da limpeza:"
  docker system df || true

  run docker container prune -f --filter "until=${CONTAINER_UNTIL}"
  run docker network prune -f
  run docker builder prune -af --filter "until=${BUILDER_UNTIL}"
  run docker image prune -af --filter "until=${BUILDER_UNTIL}"
  log "Volumes Docker preservados para proteger bancos, uploads e dados persistentes."

  log "Uso Docker depois da limpeza:"
  docker system df || true
else
  warn "Docker nao encontrado; etapa Docker ignorada."
fi

if command -v journalctl >/dev/null 2>&1; then
  run journalctl --vacuum-size="${JOURNAL_MAX_SIZE}"
fi

if command -v apt-get >/dev/null 2>&1; then
  run apt-get clean
  run apt-get autoclean -y
  log "Simulando apt-get autoremove com travas antes de executar."
  AUTOREMOVE_PLAN="$(apt-get -s autoremove || true)"
  printf '%s\n' "${AUTOREMOVE_PLAN}"
  AUTOREMOVE_COUNT="$(printf '%s\n' "${AUTOREMOVE_PLAN}" | awk '
    /^  / {
      for (i = 1; i <= NF; i++) {
        if ($i !~ /^[[:space:]]*$/) count++
      }
    }
    END { print count + 0 }
  ')"

  if printf '%s\n' "${AUTOREMOVE_PLAN}" | grep -Eiq "${PROTECTED_APT_REGEX}"; then
    warn "Autoremove bloqueado automaticamente: plano inclui pacote protegido."
  elif [[ "${AUTOREMOVE_COUNT}" -gt "${MAX_AUTOREMOVE_PACKAGES}" ]]; then
    warn "Autoremove bloqueado automaticamente: ${AUTOREMOVE_COUNT} pacotes excede o limite seguro de ${MAX_AUTOREMOVE_PACKAGES}."
  elif printf '%s\n' "${AUTOREMOVE_PLAN}" | grep -q '^0 upgraded, 0 newly installed, 0 to remove'; then
    log "Nenhuma dependencia orfa para remover."
  else
    run apt-get autoremove -y
  fi
fi

log "Estado da aplicacao depois da limpeza:"
check_app
health_check

log "Limpeza segura concluida com sucesso."
