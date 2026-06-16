# Development Guide

Guide for local development environment setup and IDE configuration. For basic commands, see [CLAUDE.md](./CLAUDE.md). For code style and testing patterns, see [AGENTS.md](./AGENTS.md). For project structure, see [llms.txt](./llms.txt).

## Prerequisites

| Tool | Required | Purpose |
|------|----------|---------|
| [nvm](https://github.com/nvm-sh/nvm) | Yes | Node.js version management |
| [Yarn](https://yarnpkg.com/) | Yes | Package manager (managed by corepack, see `package.json`) |
| [direnv](https://direnv.net/) | No | Automatic environment setup |
| [Docker](https://www.docker.com/) | No | Required only for integration tests |

## Initial Setup

```bash
# 1. Clone and enter repository
git clone git@github.com:midnightntwrk/midnight-js.git
cd midnight-js

# 2. Use correct Node version
nvm use

# 3. (Optional) Enable direnv for automatic environment
direnv allow

# 4. Install dependencies
yarn install

# 5. Build all packages
yarn build

# 6. Verify setup
yarn test
```

## Integration Tests with Docker

Integration tests require Docker Compose with proof-server, indexer, and node services.

```bash
# Start required services
cd testkit-js
docker compose up -d

# Verify services are healthy
docker compose ps

# Run integration tests (from root)
cd ..
yarn it

# Stop services
cd testkit-js
docker compose down
```

## Debug Configuration

### VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test File",
      "autoAttachChildProcesses": true,
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
      "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "smartStep": true,
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug All Tests in Package",
      "autoAttachChildProcesses": true,
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
      "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--dir", "${fileDirname}/.."],
      "smartStep": true,
      "console": "integratedTerminal"
    }
  ]
}
```

### WebStorm / IntelliJ

1. Right-click on test file → "Debug"
2. Or create Run Configuration: `Node.js` → Script: `node_modules/vitest/vitest.mjs` → Args: `run path/to/test.ts`

## Common Development Tasks

### Adding a New Package

1. Create directory under `packages/`
2. Copy structure from existing package (e.g., `network-id`)
3. Update `package.json` with correct name and dependencies
4. Add to `tsconfig.base.json` references if needed
5. Build to verify: `yarn turbo run build --filter=@midnight-ntwrk/midnight-js-<name>`

### Updating Dependencies

```bash
# Update single dependency
yarn up <package>

# Update all dependencies
yarn up

# Interactive dependency upgrade
yarn upgrade-interactive
```

### Clean Rebuild

```bash
# Clean all build artifacts
yarn clean

# Full clean rebuild
yarn clean-build
```

### Typecheck Without Building

```bash
# Check all packages
yarn turbo run check

# Check test files
yarn typecheck:tests
```

## Turborepo Commands

### Filtering

```bash
# Single package
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-utils

# Packages matching pattern
yarn turbo run build --filter='@midnight-ntwrk/midnight-js-*-provider'

# Exclude packages
yarn turbo run build --filter='!@midnight-ntwrk/testkit-*'

# Package and dependencies
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts...

# Package and dependents
yarn turbo run build --filter=...@midnight-ntwrk/midnight-js-types
```

### Caching

```bash
# Force rebuild (ignore cache)
yarn turbo run build --force

# View cache status
yarn turbo run build --dry-run
```

### Dependency Graph

```bash
# Visualize package dependencies
yarn turbo run build --graph
```

## Git Hooks

The repository uses Husky for git hooks:

| Hook | Action |
|------|--------|
| `pre-commit` | Runs ESLint on staged `.ts` files |
| `commit-msg` | Validates conventional commit format |
| `pre-push` | Runs lint and test file typecheck |

### Bypassing Hooks (Use Sparingly)

```bash
# Skip pre-commit
git commit --no-verify -m "message"

# Skip pre-push
git push --no-verify
```

### GPG Signing

The repository requires signed commits. direnv configures this automatically. Manual setup:

```bash
git config --local commit.gpgSign true
git config --local tag.gpgSign true
```

## Environment Variables

| Variable | Purpose | Set By |
|----------|---------|--------|
| `COMPACTC_VERSION` | Compact compiler version | direnv |
| `COMPACT_HOME` | Directory containing a `compactc` wrapper, used in preference to the prebuilt download. Exported by `.envrc` when `./scripts/build-compactc.sh` has been run. | direnv (auto when `.compact-home/compactc` exists) |
| `NODE_VERSION` | Node.js version | nvm |
| `TESTKIT_DOCKER_ENV` | Selects which **docker image version set** the local testkit stack uses (`qanet`, `preview`, `preprod`, `mainnet`, `devnet`). Defaults to `preprod`. Does **not** select a live network — see `MN_TEST_ENVIRONMENT`. | direnv / shell |
| `PROOF_SERVER_VERSION` | Proof-server docker image tag used by testkit compose files | `testkit-js/env/<TESTKIT_DOCKER_ENV>.env` |
| `INDEXER_VERSION` | Indexer-standalone docker image tag used by testkit compose files | `testkit-js/env/<TESTKIT_DOCKER_ENV>.env` |
| `MIDNIGHT_NODE_VERSION` | Midnight-node docker image tag used by testkit compose files | `testkit-js/env/<TESTKIT_DOCKER_ENV>.env` |

Without direnv, set manually:

```bash
export COMPACTC_VERSION=0.29.0
```

### Testkit environment selection

The testkit has **two independent axes** of configuration. Do not conflate them:

| Axis | Variable | Values | What it controls |
|------|----------|--------|------------------|
| Live test target | `MN_TEST_ENVIRONMENT` | `undeployed`, `qanet`, `preview`, `preprod`, `env-var-remote` | Where tests run against — local docker stack or a deployed network |
| Docker image versions | `TESTKIT_DOCKER_ENV` | `qanet`, `preview`, `preprod`, `mainnet`, `devnet` | Which image tags the locally-launched containers use. `MN_TEST_ENVIRONMENT=undeployed` runs the full local stack and uses all three image tags; remote modes (`qanet`/`preview`/`preprod`/`env-var-remote`) still launch a local proof-server and consume `PROOF_SERVER_VERSION` |

Both happen to use overlapping names (`qanet`/`preview`/`preprod`) because the env files bundle the image versions deployed to those live networks. `mainnet` and `devnet` exist as image-version sets only — the test framework does not run against live mainnet or devnet.

`testkit-js/compose.yml` and `testkit-js/proof-server.yml` resolve their image tags from `PROOF_SERVER_VERSION`, `INDEXER_VERSION`, and `MIDNIGHT_NODE_VERSION`. The active env file is picked by `TESTKIT_DOCKER_ENV`:

```bash
TESTKIT_DOCKER_ENV=qanet direnv reload     # use qanet image versions
TESTKIT_DOCKER_ENV=mainnet direnv reload   # use mainnet image versions
```

To override versions without changing the env, source the file manually before running docker compose:

```bash
set -a; . testkit-js/env/preprod.env; set +a
docker compose -f testkit-js/compose.yml up
```

## Building compactc from the `compact/` submodule

For feature-branch work against unreleased compactc, build the compiler from
the `compact/` git submodule (pinned to LFDT-Minokawa/compact at the `0.31.0`
release commit) instead of downloading the prebuilt binary.

Two paths — pick based on what you have installed locally:

**Path A: native nix build (fastest)**

Prerequisites: [nix](https://nixos.org/download) on the host.

```bash
git submodule update --init compact
./scripts/build-compactc.sh   # nix builds, writes .compact-home/compactc
direnv reload                  # exports COMPACT_HOME
```

**Path B: Docker build (no host nix required)**

Prerequisites: Docker. Nix runs inside the container; no host toolchain
needed. Each `compactc` invocation pays Docker startup overhead (~1–2 s on
macOS), so this is slower per-call than Path A.

```bash
git submodule update --init compact
./scripts/build-compactc-docker.sh   # builds Docker image, writes host wrapper
direnv reload                         # exports COMPACT_HOME
```

The host wrapper at `.compact-home/compactc` proxies each invocation into the
built image (`midnight-js-compactc-local:latest`).

---

After either path, `.envrc` auto-exports `COMPACT_HOME=$PWD/.compact-home`.
`packages/compact` honours it: `fetch-compactc` skips the prebuilt download
and `run-compactc` invokes `$COMPACT_HOME/compactc`.

When `COMPACT_HOME` is set, packages whose `build` script passes
`--force-on-compact-home` to `scripts/check-compiled.js` (currently
`testkit-js/testkit-js-e2e` and `packages/http-client-proof-provider`) recompile
their `.compact` contracts with the source-built compactc — otherwise the
committed `compiled/` artifacts (built against a previous compactc release)
would silently be used.

To bump the pinned compactc version: update the `compact/` submodule SHA,
update `COMPACTC_VERSION` in `.envrc`, then re-run the build script.

In CI, the prebuilt download is the default. To build from the submodule in
CI, either trigger the `CI` workflow via `workflow_dispatch` with input
`compactc_source=submodule`, or add the `compactc-from-source` label to your
pull request.

### Pairing with `@midnight-ntwrk/compact-runtime` from the same submodule

A feature-branch compactc can emit code that requires a paired
`@midnight-ntwrk/compact-runtime`. Build the runtime npm package from the
same submodule and point Yarn at it via a `file:` resolution:

```bash
# Path A: native nix
./scripts/build-compact-runtime.sh

# Path B: Docker (no host nix)
./scripts/build-compact-runtime-docker.sh

# Inject the resolution into root package.json, then install.
node scripts/use-source-compact-runtime.js
yarn install   # without --immutable; the previous step mutated package.json
```

`packages/protocol` (the only consumer) now resolves to
`./.compact-runtime-home/`. To revert when done:

```bash
node scripts/use-source-compact-runtime.js --restore
yarn install
```

In CI, the same `compactc-from-source` opt-in (PR label or workflow_dispatch
input `compactc_source=submodule`) builds both compactc and compact-runtime
and injects the `file:` resolution before `yarn build` — so the pair is
always coherent.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.
