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
| `NODE_VERSION` | Node.js version | nvm |

Without direnv, set manually:

```bash
export COMPACTC_VERSION=0.29.0
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.
