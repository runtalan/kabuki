#!/usr/bin/env bash
# Switches the active Plaid/database environment by copying one of the
# profiles in envs/ over .env.local. See PLAID_ENVIRONMENTS.md for details.
set -euo pipefail

MODE="${1:-}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="$ROOT_DIR/envs/.env.$MODE"
TARGET="$ROOT_DIR/.env.local"

valid_modes=(sandbox production-limited production)

if [[ -z "$MODE" ]] || [[ ! " ${valid_modes[*]} " =~ " $MODE " ]]; then
  echo "Usage: $0 <sandbox|production-limited|production>"
  echo
  echo "Current mode: $(grep -oP '(?<=^PLAID_ACCESS_TIER=).*' "$TARGET" 2>/dev/null || echo 'unknown')"
  exit 1
fi

if [[ ! -f "$PROFILE" ]]; then
  echo "Error: profile $PROFILE does not exist."
  exit 1
fi

cp "$TARGET" "$TARGET.bak" 2>/dev/null || true
cp "$PROFILE" "$TARGET"

echo "Switched to '$MODE'. Active .env.local now points to:"
grep -E '^(PLAID_ENV|DATABASE_URL)=' "$TARGET" | sed 's/^/  /'
echo
echo "Restart the dev server for this to take effect (Next.js only reads"
echo ".env.local at boot):"
echo "  pkill -f 'next dev' ; npm run dev"
