#!/usr/bin/env bash
# Smoke-test public API over HTTPS. Usage:
#   export API_BASE=https://api.palma.ps
#   bash deploy/scripts/smoke-test-api.sh
set -euo pipefail

API_BASE="${API_BASE:-https://api.palma.ps}"
echo "Testing API_BASE=$API_BASE"

fail() { echo "FAIL: $*" >&2; exit 1; }

code=$(curl -sS -o /tmp/palma-health.json -w "%{http_code}" "$API_BASE/health") || fail "curl health"
[[ "$code" == "200" ]] || fail "/health expected 200 got $code"
grep -q '"ok"' /tmp/palma-health.json || fail "/health body missing ok"

code=$(curl -sS -o /tmp/palma-status.json -w "%{http_code}" "$API_BASE/api/status") || fail "curl api/status"
[[ "$code" == "200" ]] || fail "/api/status expected 200 got $code"

# HTTP must redirect to HTTPS (no -L: we only care about the first response)
if [[ "$API_BASE" == https://* ]]; then
  http_base="http://${API_BASE#https://}"
  redir=$(curl -sS -o /dev/null -w "%{http_code}" "$http_base/health") || true
  [[ "$redir" == "301" || "$redir" == "308" ]] || echo "WARN: HTTP→HTTPS redirect not 301/308 (got $redir); check Nginx"
fi

echo "OK: smoke tests passed for $API_BASE"
