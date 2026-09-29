#!/bin/bash
set -e

echo "=== Copying openreview-api source ==="
rsync -a --exclude='.git' --exclude='node_modules' --exclude='logs' \
  --exclude='files' --exclude='coverage' --exclude='.clinic' --exclude='.claude' \
  /mnt/src/ /app/

# Writable runtime directories the API expects.
mkdir -p /app/logs /app/files/attachments /app/files/pdfs /app/files/temp

# Install openreview-py into a persistent venv (named volume). The API validates
# `import openreview` at startup, so it must be importable on PATH.
# Editable install: .py changes are picked up without reinstall. Only runs a full
# pip install when pyproject.toml changes (new deps).
VENV=/opt/venv
rsync -a --exclude='.git' --exclude='__pycache__' --exclude='*.egg-info' /mnt/openreview-py/ /tmp/openreview-py/

if [ ! -f "$VENV/bin/activate" ]; then
    python3 -m venv "$VENV"
fi

PY_HASH=$(md5sum /tmp/openreview-py/pyproject.toml | cut -d' ' -f1)
CACHED_PY_HASH=""
[ -f "$VENV/.hash" ] && CACHED_PY_HASH=$(cat "$VENV/.hash")
if [ "$PY_HASH" != "$CACHED_PY_HASH" ]; then
    echo "=== Installing openreview-py ==="
    "$VENV/bin/pip" install -q -e /tmp/openreview-py
    echo "$PY_HASH" > "$VENV/.hash"
else
    echo "=== openreview-py up to date, skipping install ==="
fi

# Make the venv's python available to the API (PythonShell / startup validation).
export VIRTUAL_ENV="$VENV"
export PATH="$VENV/bin:$PATH"

# npm install with caching (skip if package-lock.json unchanged).
LOCK_HASH=$(md5sum /app/package-lock.json | cut -d' ' -f1)
CACHED_HASH=""
[ -f /app/node_modules/.lock-hash ] && CACHED_HASH=$(cat /app/node_modules/.lock-hash)
if [ "$LOCK_HASH" != "$CACHED_HASH" ]; then
    echo "=== Installing npm dependencies ==="
    PUPPETEER_SKIP_DOWNLOAD=true npm ci
    echo "$LOCK_HASH" > /app/node_modules/.lock-hash
else
    echo "=== npm dependencies up to date, skipping install ==="
fi

rm -f /tmp/setup-complete
if [ "${CLEAN_START}" = "false" ]; then
  echo "=== Starting API (preserving database) ==="
  touch /tmp/setup-complete
  exec env NODE_ENV=test node app.js
else
  echo "=== Starting API (clean database) ==="
  # cleanStartApp.js starts the server, resets the DB, then logs "Setup Complete!".
  # The Express server keeps the process alive after that line.
  NODE_ENV=test node scripts/cleanStartApp.js 2>&1 | while IFS= read -r line; do
    echo "$line"
    if echo "$line" | grep -q "Setup Complete!"; then
      touch /tmp/setup-complete
    fi
  done
fi
