#!/usr/bin/env bash
set -euo pipefail
exec node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to /tmp/wrangler --ip 0.0.0.0 --port "${PORT:-10000}" --inspector-port 0
