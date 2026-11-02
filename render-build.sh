#!/usr/bin/env bash
set -euo pipefail

# Earlier releases stored the original artwork and renderer together.
# Restore binary assets and the matching vendor modules without replacing game code.
release_tmp=$(mktemp -d)
cat deploy/chunks/*.b64 | base64 --decode | tar -xz -C "$release_tmp"
src=$(find "$release_tmp" -type f -path '*/public/vendor/three.core.js' -print -quit)
test -n "$src"
pub=$(dirname "$(dirname "$src")")
cp -R "$pub/vendor/." public/vendor/
cp -rn "$pub/assets/." public/assets/
cp "$pub/credits.html" public/credits.html
test "$(git hash-object --no-filters public/vendor/three.core.js)" = 7dcd0fbcbc04b8d9a20ecb96c1ce344cb55150d5
test "$(git hash-object --no-filters public/assets/hand-right.glb)" = 215f50d70fb7a5a884025b508cf5c58230913371
test "$(git hash-object --no-filters public/assets/characters-v1.png)" = 907791839354b063382ee32b778161f0582f6678
