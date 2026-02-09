# Release Notes v3.1.0

**Release Date:** February 9, 2025
**Previous Version:** v3.0.0
**Node.js Requirement:** >=22

## Features

### Private State Import/Export (#435)

New `exportPrivateStates()` and `importPrivateStates()` methods enable backup and restore of encrypted private state data.

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const provider = levelPrivateStateProvider({ walletProvider });

// Export all private states
const exportData = await provider.exportPrivateStates({
  password: 'secure-export-password' // Optional, defaults to storage password
});

// Import private states with conflict handling
await provider.importPrivateStates(exportData, {
  password: 'secure-export-password',
  onConflict: 'skip' // Options: 'skip', 'overwrite', 'error'
});
```

**Security features:**
- AES-256-GCM encryption for exports
- Configurable password (min 16 characters)
- Versioned export format for forward compatibility
- Configurable `maxStates` limit (default 10000) to prevent memory exhaustion

### Contract Address Scoping for Private State (#470)

Private state operations are now scoped by contract address, ensuring namespace isolation across contracts.

```typescript
const deployed = await deployContract(providers, {
  compiledContract: MyContract,
  privateStateId: 'myState',
  initialPrivateState: { ... }
});

// Private state is automatically scoped to the deployed contract address
const result = await deployed.callTx.myCircuit(args);
```

The `setContractAddress` method is automatically called during:
- Contract deployment (`deployContract`)
- Contract discovery (`findDeployedContract`)
- Call transactions (`submitCallTx`)

## Bug Fixes

### TransactionContext Excluded from Circuit Arguments (#497)

Fixed an issue where `TransactionContext` was incorrectly included in circuit call arguments, causing type mismatches.

## Dependencies

### Runtime Dependencies Updated
- Multiple library updates (#485)
- Yarn updated to 4.12.0

### TestKit Updates
- Bumped `indexer` and `node` images to latest versions (#490)

### CI/CD Dependencies
- `actions/github-script`: 7 → 8
- `docker/login-action`: 3.6.0 → 3.7.0
- `mikepenz/action-junit-report`: 6.1.0 → 6.2.0
- Security update for `tar` package

## Internal Changes

- Replaced `it` with `test` in all test files for consistency (#491)
- Removed deprecated TestKit.js CD workflow (#492)
- Refactored tokens tests (#486)

## Links

- [New Features Guide](./new-features.md)
- [Migration Guide](./migration-guide.md)
- [API Changes Reference](./api-changes.md)
- [GitHub Repository](https://github.com/midnightntwrk/midnight-js)
