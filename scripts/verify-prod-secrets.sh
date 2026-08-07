#!/usr/bin/env bash
# Compares every live Firebase App Hosting secret against envs/.env.production
# so a drift (e.g. prod pointing at a sandbox Plaid key) is caught before it
# causes a silent runtime bug. Run before/after any deploy that touches
# secrets, or any time production behaves like sandbox for no visible reason.
set -euo pipefail

cd "$(dirname "$0")/.."

PROD_ENV_FILE="envs/.env.production"
PROJECT="buttons-abc4d"

if [ ! -f "$PROD_ENV_FILE" ]; then
  echo "Missing $PROD_ENV_FILE — can't verify." >&2
  exit 1
fi

FAIL=0

check_secret() {
  local key="$1"
  local expected
  expected=$(grep "^${key}=" "$PROD_ENV_FILE" | cut -d= -f2-)
  if [ -z "$expected" ]; then
    return
  fi
  local actual
  actual=$(npx firebase apphosting:secrets:access "$key" --project "$PROJECT" 2>/dev/null || echo "<error fetching>")
  if [ "$actual" != "$expected" ]; then
    echo "MISMATCH  $key"
    echo "  live:     $actual"
    echo "  expected: $expected"
    FAIL=1
  else
    echo "OK        $key"
  fi
}

for key in DATABASE_URL AUTH_SECRET AUTH_URL AUTH_GOOGLE_ID AUTH_GOOGLE_SECRET PLAID_CLIENT_ID PLAID_SECRET PLAID_ENV SUPABASE_SERVICE_ROLE_KEY APCA_API_KEY_ID APCA_API_SECRET_KEY; do
  check_secret "$key"
done

if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "One or more live secrets don't match envs/.env.production. Fix with:"
  echo '  printf "%s" "<value>" | npx firebase apphosting:secrets:set <KEY> --project buttons-abc4d --data-file -'
  echo "Then force a new Cloud Run revision so it's picked up:"
  echo "  gcloud run services update kabuki --project buttons-abc4d --region us-east4 --update-secrets=<KEY>=<KEY>:latest"
  exit 1
fi

echo ""
echo "All live secrets match envs/.env.production."
