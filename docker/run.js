#!/usr/bin/env node
// OpenReview-js Docker test harness.
//
// Brings up a full stack (MongoDB replica set + Redis + Elasticsearch +
// openreview-api) in a shared network namespace and runs the openreview-js
// mocha suites against it. JS-native analog of openreview-py/docker/run.py.
//
// Usage:
//   node docker/run.js test [all|client|meta] [-- <mocha args>]
//   node docker/run.js serve
//   node docker/run.js shell
//   node docker/run.js down | clean
//
// Flags: --no-checkout  --no-clean  --keep-infra
//        --branch-api=<b>  --branch-py=<b>

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCKER_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = resolve(DOCKER_DIR, 'config.json');
const CONFIG_EXAMPLE = resolve(DOCKER_DIR, 'config.example.json');
const WORKTREE_FILE = resolve(DOCKER_DIR, '.docker-compose.worktree.yml');

// Each service's `.git` tmpfs masks (from docker-compose.yml) and which host
// repo each one shadows: "api" is the openreview-api mount at /mnt/src, "py" is
// the openreview-py mount at /mnt/openreview-py. A tmpfs only mounts over a
// *directory*; a git worktree's `.git` is a *file* (a gitdir pointer), so an
// entry must be stripped when its host `.git` is not a directory.
const SERVICE_GIT_TMPFS = {
  api: [['/mnt/src/.git', 'api'], ['/mnt/openreview-py/.git', 'py']],
};

const DEFAULTS = {
  api: { path: '../../openreview-api', branch: '' },
  py: { path: '../../openreview-py', branch: '' },
  elasticsearch_version: '7.6.0',
  test_target: 'all',
  auto_checkout: true,
  keep_infra: false,
};

function die(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) {
    die(
      `config.json not found.\n` +
      `Copy the example config and edit it for your setup:\n` +
      `  cp ${CONFIG_EXAMPLE} ${CONFIG_FILE}`
    );
  }
  let user;
  try {
    user = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    die(`config.json is not valid JSON: ${e.message}`);
  }
  return {
    ...DEFAULTS,
    ...user,
    api: { ...DEFAULTS.api, ...(user.api || {}) },
    py: { ...DEFAULTS.py, ...(user.py || {}) },
  };
}

// Parse argv into { command, target, flags, mochaArgs }.
function parseArgs(argv) {
  const flags = { noCheckout: false, noClean: false, keepInfra: false, branchApi: null, branchPy: null };
  const positional = [];
  let mochaArgs = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { mochaArgs = argv.slice(i + 1); break; }
    else if (a === '--no-checkout') flags.noCheckout = true;
    else if (a === '--no-clean') flags.noClean = true;
    else if (a === '--keep-infra') flags.keepInfra = true;
    else if (a.startsWith('--branch-api=')) flags.branchApi = a.split('=')[1];
    else if (a.startsWith('--branch-py=')) flags.branchPy = a.split('=')[1];
    else positional.push(a);
  }
  return { command: positional[0] || 'test', target: positional[1], flags, mochaArgs };
}

function run(cmd, args, env) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { cwd: DOCKER_DIR, stdio: 'inherit', env: { ...process.env, ...env } });
  if (res.error) die(`failed to run ${cmd}: ${res.error.message}`);
  return res.status ?? 1;
}

// Resolve a config path (relative paths are relative to the docker/ dir).
function resolvePath(p) {
  return resolve(DOCKER_DIR, p);
}

// True only when the repo's `.git` is a real directory (a normal checkout).
// A git worktree's `.git` is a file, and a missing repo has none.
function gitDirIsDirectory(repoPath) {
  try {
    return statSync(resolve(repoPath, '.git')).isDirectory();
  } catch {
    return false;
  }
}

function currentBranch(repoPath) {
  const r = spawnSync('git', ['-C', repoPath, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

// Return the sibling worktree path where `branch` is checked out, or null.
// Skips the main worktree (repoPath itself).
function findWorktreeForBranch(repoPath, branch) {
  const r = spawnSync('git', ['-C', repoPath, 'worktree', 'list', '--porcelain'], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const mainWorktree = resolve(repoPath);
  const target = `refs/heads/${branch}`;
  let current = null;
  for (const line of r.stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      current = line.slice('worktree '.length);
    } else if (line.startsWith('branch ') && line.slice('branch '.length) === target) {
      if (current && resolve(current) !== mainWorktree) return current;
    }
  }
  return null;
}

// Ensure `branch` is checked out for `name`, returning the resolved repo path.
// If the branch is already checked out in a sibling worktree, that path is used
// (no checkout). If the repo is already on the branch, checkout is skipped (so
// local uncommitted changes are harmless). Otherwise a clean checkout is done.
function resolveRepo(name, repoPath, branch, doCheckout) {
  if (!doCheckout || !branch) return repoPath;
  if (!existsSync(repoPath)) die(`${name} repo not found at ${repoPath}`);

  const worktreePath = findWorktreeForBranch(repoPath, branch);
  if (worktreePath) {
    console.log(`Using worktree at ${worktreePath} for ${name} branch '${branch}'`);
    return resolve(worktreePath);
  }

  if (currentBranch(repoPath) === branch) {
    console.log(`${name} already on '${branch}', skipping checkout`);
    return repoPath;
  }

  const status = spawnSync('git', ['-C', repoPath, 'status', '--porcelain'], { encoding: 'utf8' });
  if (status.status !== 0) die(`${name}: not a git repo at ${repoPath}`);
  if (status.stdout.trim()) die(`${name}: working tree at ${repoPath} is dirty; commit/stash or use --no-checkout`);
  console.log(`=== ${name}: checking out ${branch} ===`);
  if (run('git', ['-C', repoPath, 'checkout', branch]) !== 0) die(`${name}: failed to checkout ${branch}`);
  return repoPath;
}

// Write a compose override stripping `.git` tmpfs masks that can't mount because
// the host `.git` is a file (a worktree) or missing. Returns the override path,
// or null if none is needed (and removes any stale override file).
// Requires Docker Compose >= v2.24 for the `!override` YAML tag.
function writeWorktreeOverride(paths) {
  const overrides = {}; // service -> tmpfs entries to keep
  for (const [svc, entries] of Object.entries(SERVICE_GIT_TMPFS)) {
    const kept = entries
      .filter(([, which]) => gitDirIsDirectory(paths[which]))
      .map(([containerPath]) => containerPath);
    if (kept.length !== entries.length) overrides[svc] = kept; // something to strip
  }

  if (Object.keys(overrides).length === 0) {
    if (existsSync(WORKTREE_FILE)) unlinkSync(WORKTREE_FILE);
    return null;
  }

  const lines = ['# Auto-generated by run.js — do not edit.', 'services:'];
  for (const [svc, kept] of Object.entries(overrides)) {
    lines.push(`  ${svc}:`);
    if (kept.length) {
      lines.push('    tmpfs: !override');
      for (const entry of kept) lines.push(`      - ${entry}`);
    } else {
      lines.push('    tmpfs: !override []');
    }
  }
  writeFileSync(WORKTREE_FILE, lines.join('\n') + '\n');
  return WORKTREE_FILE;
}

function main() {
  const { command, target, flags, mochaArgs } = parseArgs(process.argv.slice(2));
  const config = loadConfig();

  let apiPath = resolvePath(config.api.path);
  let pyPath = resolvePath(config.py.path);

  // Auto-checkout may redirect a path to an existing worktree.
  const needsStack = command === 'test' || command === 'serve' || command === 'shell';
  const doCheckout = config.auto_checkout && !flags.noCheckout;
  if (needsStack && doCheckout) {
    apiPath = resolveRepo('openreview-api', apiPath, flags.branchApi ?? config.api.branch, true);
    pyPath = resolveRepo('openreview-py', pyPath, flags.branchPy ?? config.py.branch, true);
  }

  // Strip `.git` tmpfs masks for any mounted repo that's a worktree.
  const overrideFile = writeWorktreeOverride({ api: apiPath, py: pyPath });
  const overrideArg = overrideFile ? ['-f', '.docker-compose.worktree.yml'] : [];

  const composeEnv = {
    API_PATH: apiPath,
    PY_PATH: pyPath,
    ELASTICSEARCH_VERSION: config.elasticsearch_version,
    CLEAN_START: flags.noClean ? 'false' : 'true',
  };

  // Override files come last so they take precedence over the base compose.
  const compose = ['compose', '-f', 'docker-compose.yml', ...overrideArg];
  const composeServe = ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.serve.yml', ...overrideArg];
  const infra = ['mongo', 'redis', 'elasticsearch', 'api'];

  const keepInfra = flags.keepInfra || config.keep_infra;

  const teardown = () => {
    if (keepInfra) {
      console.log('\n=== Keeping infrastructure up (stopping API only) ===');
      run('docker', [...compose, 'rm', '-sf', 'api'], composeEnv);
    } else {
      run('docker', [...compose, 'down'], composeEnv);
    }
  };

  switch (command) {
    case 'test': {
      for (const p of [apiPath, pyPath]) if (!existsSync(p)) die(`path does not exist: ${p} (check docker/config.json)`);
      const testTarget = target || config.test_target || 'all';
      // Fresh API each run so the database starts clean.
      run('docker', [...compose, 'rm', '-sf', 'api'], composeEnv);
      if (run('docker', [...compose, 'up', '-d', '--wait', '--build', ...infra], composeEnv) !== 0) {
        console.error('\nStack failed to become healthy. Recent API logs:');
        run('docker', [...compose, 'logs', '--tail', '50', 'api'], composeEnv);
        teardown();
        process.exit(1);
      }
      const status = run('docker', [...compose, 'run', '--rm', '--build', '-e', `TEST_TARGET=${testTarget}`, 'test', ...mochaArgs], composeEnv);
      teardown();
      process.exit(status);
      break;
    }

    case 'serve': {
      for (const p of [apiPath, pyPath]) if (!existsSync(p)) die(`path does not exist: ${p} (check docker/config.json)`);
      if (run('docker', [...composeServe, 'up', '-d', '--wait', '--build', ...infra], composeEnv) !== 0) {
        run('docker', [...composeServe, 'logs', '--tail', '50', 'api'], composeEnv);
        process.exit(1);
      }
      console.log('\n=== Stack is up ===');
      console.log('  API:           http://localhost:3001');
      console.log('  Elasticsearch: http://localhost:9200');
      console.log('  MongoDB:       localhost:27017');
      console.log('\nRun tests from the host, e.g.:  npm run test -w @openreview/client');
      console.log('Tear down with:                 node docker/run.js down');
      break;
    }

    case 'shell': {
      for (const p of [apiPath, pyPath]) if (!existsSync(p)) die(`path does not exist: ${p} (check docker/config.json)`);
      if (run('docker', [...compose, 'up', '-d', '--wait', '--build', ...infra], composeEnv) !== 0) {
        run('docker', [...compose, 'logs', '--tail', '50', 'api'], composeEnv);
        teardown();
        process.exit(1);
      }
      run('docker', [...compose, 'run', '--rm', '--build', '--entrypoint', 'bash', 'test', '/docker/scripts/test-shell-entrypoint.sh'], composeEnv);
      teardown();
      break;
    }

    case 'down':
      run('docker', [...compose, 'down'], composeEnv);
      break;

    case 'clean':
      run('docker', [...compose, 'down', '-v'], composeEnv);
      break;

    default:
      die(`unknown command '${command}'. Use: test | serve | shell | down | clean`);
  }
}

main();
