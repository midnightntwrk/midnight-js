---
name: run-e2e
description: Run midnight-js end-to-end tests locally, one test file or the fork-matrix smoke lane, and read the result correctly. Use when asked to run, debug or verify e2e tests in testkit-js/testkit-js-e2e, a single e2e test file, or the consumer-e2e fork lane.
---

# Run e2e tests locally

Requires Docker running and a built repository (`yarn build`).

## One test file

From `testkit-js/testkit-js-e2e`:

```bash
MN_TEST_FILE=<file name> MN_DEBUG=true yarn e2e-single
```

`MN_TEST_FILE` is required (`vitest.single.config.ts` throws without it). `MN_DEBUG=true`
prints transaction submission details.

## Environment without direnv

The Docker image tags come from `testkit-js/env/<env>.env`, which `.envrc` loads through
direnv (`TESTKIT_DOCKER_ENV`, default `devnet`). Without direnv, for example in a fresh
worktree before `direnv allow`, the tags are empty and the run fails almost at once with
an image like `ghcr.io/midnight-ntwrk/indexer-standalone:` (empty tag). Load it by hand
from the repository root:

```bash
set -a && . testkit-js/env/devnet.env && set +a
export COMPACTC_VERSION=<value from .envrc>
cd testkit-js/testkit-js-e2e && MN_TEST_FILE=<file name> MN_DEBUG=true yarn e2e-single
```

## Reading the result

- A run that finishes within seconds is an environment failure, not a test result.
  Search the log for the `Tests ` summary line before you trust the exit code.
- Do not pipe the run into `tail` and then read `$?`: that is `tail`'s exit code.

## Fork-matrix smoke lane (consumer-e2e)

Runs the hard-fork lane locally instead of waiting for CI:

```bash
GITHUB_TOKEN=$(gh auth token) node consumer-e2e/fork-matrix-smoke.mjs pnp --contracts=<shard>
```

- `GITHUB_TOKEN` must be a GitHub token. An npm token gives `401 Unauthorized` when the
  compactc download starts.
- Node must match `.nvmrc`. An older Node crashes in undici's `decompress.js`.
- The run leaves untracked `consumer-e2e/stack-logs/` and `.tarballs/` behind.
