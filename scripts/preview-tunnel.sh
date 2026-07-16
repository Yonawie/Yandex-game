#!/usr/bin/env bash
# Keep a Cloudflare quick tunnel alive for local preview (port 4173).
set -euo pipefail

PORT="${PORT:-4173}"
CF_BIN="${CF_BIN:-/tmp/cloudflared}"
URL_FILE="${URL_FILE:-/tmp/preview-url.txt}"
LOG_FILE="${LOG_FILE:-/tmp/cf-tunnel.log}"

if [[ ! -x "$CF_BIN" ]]; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$CF_BIN"
  chmod +x "$CF_BIN"
fi

if ! curl -sf "http://127.0.0.1:${PORT}/" >/dev/null; then
  echo "Local server not responding on :${PORT}. Start with: npm start" >&2
  exit 1
fi

extract_url() {
  grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | tail -1 || true
}

start_tunnel() {
  : >"$LOG_FILE"
  "$CF_BIN" tunnel --url "http://127.0.0.1:${PORT}" >"$LOG_FILE" 2>&1 &
  echo $! > /tmp/cf-tunnel.pid
  for _ in $(seq 1 30); do
    url=$(extract_url)
    if [[ -n "$url" ]]; then
      echo "$url" >"$URL_FILE"
      echo "Preview: $url"
      return 0
    fi
    sleep 1
  done
  echo "Failed to obtain tunnel URL" >&2
  return 1
}

heartbeat() {
  local url
  url=$(cat "$URL_FILE" 2>/dev/null || true)
  [[ -z "$url" ]] && return 1
  curl -sf --max-time 20 "$url/" >/dev/null
}

# Kill old tunnel if any
if [[ -f /tmp/cf-tunnel.pid ]]; then
  kill "$(cat /tmp/cf-tunnel.pid)" 2>/dev/null || true
fi
pkill -f "$CF_BIN tunnel --url" 2>/dev/null || true
sleep 0.5

start_tunnel

while true; do
  sleep 45
  if ! heartbeat; then
    echo "Tunnel unhealthy — restarting…" >&2
    if [[ -f /tmp/cf-tunnel.pid ]]; then
      kill "$(cat /tmp/cf-tunnel.pid)" 2>/dev/null || true
    fi
    pkill -f "$CF_BIN tunnel --url" 2>/dev/null || true
    sleep 1
    start_tunnel || true
  fi
done
