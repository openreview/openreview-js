#!/bin/bash
set -e

echo "=== Copying openreview-js source ==="
rsync -a --exclude='.git' --exclude='node_modules' --exclude='coverage' \
  --exclude='.claude' /mnt/src/ /app/

cd /app

LOCK_HASH=$(md5sum /app/package-lock.json | cut -d' ' -f1)
CACHED_HASH=""
[ -f /app/node_modules/.lock-hash ] && CACHED_HASH=$(cat /app/node_modules/.lock-hash)
if [ "$LOCK_HASH" != "$CACHED_HASH" ]; then
    echo "=== Installing npm dependencies ==="
    npm install
    echo "$LOCK_HASH" > /app/node_modules/.lock-hash
else
    echo "=== npm dependencies up to date, skipping install ==="
fi

echo "=== Dropping into interactive shell (the full stack is up) ==="
echo "    Run tests against the API with, e.g.:"
echo "      npm run test -w @openreview/client"
echo "      npm run test -w @openreview/meta-extraction"
exec bash
