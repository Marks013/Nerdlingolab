#!/usr/bin/env bash
set -Eeuo pipefail

capture_dir="${SUPPLIER_CAPTURE_DIR:-/supplier-capture}"
interval_minutes="${SUPPLIER_CAPTURE_INTERVAL_MINUTES:-720}"
run_on_start="${SUPPLIER_CAPTURE_RUN_ON_START:-true}"
run_once_mode="${SUPPLIER_CAPTURE_ONCE:-false}"
scope="${SUPPLIER_CAPTURE_SCOPE:-active}"
provider="${SUPPLIER_CAPTURE_PROVIDER:-}"
status="${SUPPLIER_CAPTURE_STATUS:-}"
query="${SUPPLIER_CAPTURE_QUERY:-}"
limit="${SUPPLIER_CAPTURE_LIMIT:-}"
delay="${SUPPLIER_CAPTURE_DELAY_MS:-1200}"
skip_review_only="${SUPPLIER_CAPTURE_SKIP_REVIEW_ONLY:-true}"
import_result="${SUPPLIER_CAPTURE_IMPORT:-true}"
profile_dir="${SUPPLIER_PLAYWRIGHT_PROFILE:-${capture_dir}/profile}"
lock_dir="${capture_dir}/.capture.lock"
lock_acquired=false

mkdir -p "${capture_dir}/input" "${capture_dir}/output" "${capture_dir}/logs" "${profile_dir}"

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

cleanup_lock() {
  if [[ "${lock_acquired}" == "true" ]]; then
    rm -rf "${lock_dir}"
    lock_acquired=false
  fi
}

run_capture_once() {
  lock_acquired=true
  trap cleanup_lock RETURN EXIT INT TERM

  if ! mkdir "${lock_dir}" 2>/dev/null; then
    lock_acquired=false
    log "Outra captura de fornecedores ja esta em andamento. Pulando esta rodada."
    return 0
  fi

  local run_id input_csv output_csv log_file
  run_id="$(date -u '+%Y%m%dT%H%M%SZ')"
  input_csv="${capture_dir}/input/fornecedores-${run_id}.csv"
  output_csv="${capture_dir}/output/fornecedores-capturados-${run_id}.csv"
  log_file="${capture_dir}/logs/fornecedores-${run_id}.log"

  log "Iniciando captura assistida de fornecedores (${run_id})." | tee -a "${log_file}"

  local export_args=(--output "${input_csv}" --scope "${scope}")
  if [[ -n "${provider}" ]]; then
    export_args+=(--fornecedor "${provider}")
  fi
  if [[ -n "${status}" ]]; then
    export_args+=(--status "${status}")
  fi
  if [[ -n "${query}" ]]; then
    export_args+=(--busca "${query}")
  fi

  npm run suppliers:export -- "${export_args[@]}" | tee -a "${log_file}"

  local collect_args=(--input "${input_csv}" --output "${output_csv}" --profile "${profile_dir}" --delay "${delay}")
  if [[ -n "${limit}" ]]; then
    collect_args+=(--limit "${limit}")
  fi
  if [[ "${skip_review_only}" != "false" ]]; then
    collect_args+=(--skip-review-only)
  fi

  npm run suppliers:collect -- "${collect_args[@]}" | tee -a "${log_file}"

  if [[ "${import_result}" != "false" ]]; then
    npm run suppliers:import -- --input "${output_csv}" | tee -a "${log_file}"
  else
    log "Importacao automatica desativada. CSV final: ${output_csv}" | tee -a "${log_file}"
  fi

  log "Captura assistida concluida (${run_id})." | tee -a "${log_file}"
}

sleep_interval() {
  local seconds
  seconds=$((interval_minutes * 60))
  log "Proxima captura em ${interval_minutes} minuto(s)."
  sleep "${seconds}"
}

if [[ "${run_once_mode}" == "true" ]]; then
  run_capture_once
  exit 0
fi

if [[ "${run_on_start}" != "false" ]]; then
  run_capture_once
else
  sleep_interval
fi

while true; do
  sleep_interval
  run_capture_once
done
