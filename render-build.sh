#!/usr/bin/env bash
set -euo pipefail
mkdir -p /tmp/wudu-deploy
cat deploy/chunks/*.b64 | base64 -d > /tmp/wudu-deploy/wudu-source.tgz
tar -xzf /tmp/wudu-deploy/wudu-source.tgz -C .
npm ci
npm run build
