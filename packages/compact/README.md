# Compact

Compact compiler manager for Midnight smart contracts. Fetches, manages, and runs the `compactc` compiler.

## Installation

```bash
yarn add -D @midnight-ntwrk/midnight-js-compact
```

## Quick Start

```bash
# Fetch the compiler (version from COMPACTC_VERSION env var)
yarn fetch-compactc

# Compile a contract
yarn run-compactc ./contract.compact ./output
```

## CLI Commands

### fetch-compactc

Downloads and manages Compact compiler versions.

| Flag                  | Description                           |
| --------------------- | ------------------------------------- |
| `--version=<version>` | Specify version to download           |
| `--force`             | Force re-download existing version    |
| `--list-versions`     | List all installed versions           |
| `--cleanup=<count>`   | Keep only the latest N versions       |
| `--help`              | Show help                             |

```bash
# Download specific version
yarn fetch-compactc --version=1.0.0

# List installed versions
yarn fetch-compactc --list-versions

# Cleanup old versions, keep latest 3
yarn fetch-compactc --cleanup=3
```

### run-compactc

Executes the Compact compiler.

```bash
yarn run-compactc <input-file> <output-dir> [options]
```

## Configuration

### Environment Variables

| Variable          | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `COMPACTC_VERSION`| Version to fetch/run (required if `--version` not provided)      |
| `COMPACT_HOME`    | Custom Compact installation path (skips managed versions)        |

### Platform Support

| Platform        | Architecture    | Method   |
| --------------- | --------------- | -------- |
| macOS           | arm64, x64      | Binary   |
| Linux           | arm64, x64      | Binary   |
| Other           | -               | Docker   |

## Version Management

The package manages multiple compiler versions in `managed/` directory:

```
managed/
├── 1.0.0/
│   └── compactc
├── 1.1.0/
│   └── compactc
└── 1.2.0/
    └── compactc
```

When `COMPACT_HOME` is not set and no specific version is requested, the latest installed version is used.

## API

### VersionManager

```typescript
import { VersionManager } from '@midnight-ntwrk/midnight-js-compact';

const manager = new VersionManager(packageDir);

manager.listVersions();                  // Get all installed versions
manager.versionExists('1.0.0');          // Check if version exists
manager.getVersionDir('1.0.0');          // Get version directory path
manager.getCompactcPath('1.0.0');        // Get compactc binary path
manager.removeVersion('1.0.0');          // Remove specific version
manager.cleanupOldVersions(3);           // Keep only latest 3 versions
```

### Utility Functions

```typescript
import { resolveCompactPath } from '@midnight-ntwrk/midnight-js-compact';

// Resolves path to compactc (respects COMPACT_HOME, falls back to managed versions)
const compactPath = resolveCompactPath(packageDir, optionalVersion);
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
