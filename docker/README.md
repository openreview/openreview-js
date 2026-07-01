# openreview-js Docker test harness

Runs the `openreview-js` mocha suites against a full local OpenReview stack —
MongoDB (replica set) + Redis + Elasticsearch + `openreview-api` — reproducing
what `.github/workflows/build.yml` does in CI, with one command.

This mirrors the harness in [`openreview-py/docker`](../../openreview-py/docker),
reduced to what the JS tests need.

## Prerequisites

- Docker (with Compose v2: `docker compose`).
- Sibling checkouts of **`openreview-api`** and **`openreview-py`** on disk. By
  default they're expected at `../../openreview-api` and `../../openreview-py`
  (i.e. next to `openreview-js`). Override the paths in `config.json`.

## Setup

```bash
cp docker/config.example.json docker/config.json
# edit docker/config.json if your sibling repos live elsewhere
```

`config.json` (git-ignored) fields:

| Field                   | Meaning                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `api.path` / `py.path`  | Paths to the sibling `openreview-api` / `openreview-py` repos. |
| `api.branch`/`py.branch`| Optional branch to auto-checkout before running.              |
| `elasticsearch_version` | Elasticsearch image tag (default `7.6.0`, matching CI).       |
| `test_target`           | Default suite: `all` \| `client` \| `meta`.                   |
| `auto_checkout`         | Checkout the configured branches on run (clean tree required).|
| `keep_infra`            | Keep mongo/redis/es running after a `test` run.               |

## Usage

```bash
node docker/run.js test              # run all suites (default target)
node docker/run.js test client       # only packages/client (needs the API)
node docker/run.js test meta         # only packages/meta-extraction
node docker/run.js test client -- --grep "should register"   # pass mocha args

node docker/run.js serve             # bring the stack up and leave it running
node docker/run.js shell             # interactive shell with the stack up
node docker/run.js down              # stop and remove containers
node docker/run.js clean             # also remove named volumes (caches)
```

Equivalent npm scripts: `npm run docker:test`, `docker:serve`, `docker:shell`,
`docker:down`, `docker:clean`.

Flags: `--no-checkout`, `--no-clean` (preserve DB), `--keep-infra`,
`--branch-api=<b>`, `--branch-py=<b>`.

## How it works

- A `pod` container owns the network namespace; every other service joins it
  with `network_mode: "service:pod"`, so `localhost` is shared. This lets the
  API run under `NODE_ENV=test` unchanged (its config points at
  `localhost:27017/6379/9200`, port `3001`).
- Source is rsync-ed from **read-only** mounts into each container, so your host
  repos are never modified. `node_modules` and the Python venv live in named
  volumes and are only reinstalled when `package-lock.json` / `pyproject.toml`
  change.
- The API container installs `openreview-py` into a venv (the API validates
  `import openreview` at startup) and runs `cleanStartApp.js`; a
  `/tmp/setup-complete` marker (written when it logs `Setup Complete!`) drives
  the Compose healthcheck, so the `test` container only starts once the API is
  ready.

## Git worktrees

The `api` service `tmpfs`-masks the host `.git` of the mounted `openreview-api`
and `openreview-py` repos. A tmpfs can only mount over a *directory*, but a git
worktree's `.git` is a *file* (a gitdir pointer). So when a configured path (or
a branch resolved to a sibling worktree) is a worktree, `run.js` auto-generates
`.docker-compose.worktree.yml` (git-ignored) that strips just those masks via
Compose's `!override` tag — no OCI mount error. Requires Docker Compose ≥ v2.24.

Auto-checkout is also worktree-aware: if a configured `branch` is already
checked out in a sibling worktree, that worktree is mounted directly; and if the
repo is already on the requested branch, checkout is skipped (so local
uncommitted changes don't block a run).

## Notes

- **`meta-extraction` tests hit live third-party sites** (arXiv, ACL, AAAI, …)
  via puppeteer's bundled Chromium and are inherently slow/flaky. Prefer
  `test client` for reliable, infra-backed runs. Network failures there are
  environmental, not harness bugs.
- The `test` container runs as the non-root `node` user (Chromium won't start as
  root without `--no-sandbox`, which the app doesn't pass) with unconfined
  seccomp for the browser sandbox. It uses Debian's `chromium` package (built for
  the image's arch — there's no arm64 Linux build of puppeteer's Chrome) via
  `PUPPETEER_EXECUTABLE_PATH`, so it works on both Apple Silicon and Intel.
- First run builds images and downloads dependencies (slow). Subsequent runs
  reuse the cached volumes.
- Elasticsearch may need a higher `vm.max_map_count` on Linux hosts
  (`sudo sysctl -w vm.max_map_count=262144`).
