#!/bin/bash
set -e

echo "=== Copying openreview-js source ==="
rsync -a --exclude='.git' --exclude='node_modules' --exclude='coverage' \
  --exclude='.claude' /mnt/src/ /app/

cd /app

# npm install with caching (skip if package-lock.json unchanged). Installs both
# workspaces (packages/client, packages/meta-extraction). Let puppeteer download
# its Chromium — meta-extraction launches it with no executablePath.
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

TARGET="${TEST_TARGET:-all}"
echo "=== Running tests (target: $TARGET) ==="

# Any extra args ("$@") are passed through to mocha for the selected workspace(s).
case "$TARGET" in
  client)
    exec npm run test -w @openreview/client -- "$@"
    ;;
  meta|meta-extraction)
    exec npm run test -w @openreview/meta-extraction -- "$@"
    ;;
  all|*)
    if [ "$#" -gt 0 ]; then
      echo "Note: extra mocha args are ignored when target is 'all'; pick 'client' or 'meta'." >&2
    fi
    exec npm run --workspaces test
    ;;
esac
