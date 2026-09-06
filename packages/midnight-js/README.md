# Midnight.js

Barrel package that provides a single entry point to the core components of Midnight.js. Import all core modules from one package instead of installing them individually.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js
```

## Quick Start

```typescript
import { contracts, networkId, types, utils } from '@midnight-ntwrk/midnight-js';

networkId.setNetworkId('testnet');

const deployed = await contracts.deployContract(providers, {
  compiledContract: myContract,
  privateStateId: 'my-state',
  initialPrivateState: { counter: 0n }
});
```

## Modules

| Module       | Package                                  | Description                                    |
| ------------ | ---------------------------------------- | ---------------------------------------------- |
| `contracts`  | `@midnight-ntwrk/midnight-js-contracts`  | Contract deployment and interaction utilities   |
| `networkId`  | `@midnight-ntwrk/midnight-js-network-id` | Network identifier management                  |
| `types`      | `@midnight-ntwrk/midnight-js-types`      | Shared types, interfaces, and provider contracts|
| `utils`      | `@midnight-ntwrk/midnight-js-utils`      | Hex encoding, address validation, and utilities |

## Ledger Era Vocabulary

The network runs one of two ledger eras, `v8` or `v9`. The names for saying
which era produced a payload or a record are re-exported from the barrel
directly, alongside the namespaces above:

```typescript
import {
  LEDGER_VERSIONS,         // the closed, frozen set: ['v8', 'v9']
  type LedgerVersion,      // 'v8' | 'v9'
  protocolVersionToLedger, // a raw protocolVersion integer -> LedgerVersion
  versionOfRecord,         // a record carrying protocolVersion -> LedgerVersion
  networkHeadVersion       // asks a source for the network head -> LedgerVersion
} from '@midnight-ntwrk/midnight-js';
```

The three resolvers throw `UnknownProtocolVersionError` when a
`protocolVersion` has no known era, so the error and its codes are published
alongside them:

```typescript
import {
  PROTOCOL_ERROR_CODES,
  type ProtocolVersionUnknownReason,
  UnknownProtocolVersionError,
  utils,
  versionOfRecord,
  type VersionResolutionPath
} from '@midnight-ntwrk/midnight-js';

// Any record carrying a raw protocolVersion -- e.g. a transaction or block
// already read from the indexer.
const record = { protocolVersion: 1_000_000 };

try {
  const era = versionOfRecord(record);
  console.log(`this record was written under ledger ${era}`);
} catch (error) {
  if (utils.hasErrorCode(error, PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ)) {
    // a record this build has no era for
  }
  if (error instanceof UnknownProtocolVersionError) {
    const path: VersionResolutionPath = error.path;
    const reason: ProtocolVersionUnknownReason = error.reason;
    console.warn(`could not resolve an era on the ${path} path: ${reason}`);
  }
}
```

The pre-fork ledger runtime itself is **not** re-exported here, and importing
the barrel does not load it.

## Sub-path Imports

Each module is also available as a sub-path import for tree-shaking:

```typescript
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js/contracts';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import { type ProofProvider, type WalletProvider } from '@midnight-ntwrk/midnight-js/types';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js/utils';
```

## Exports

```typescript
// Namespace imports (all modules)
import { contracts, networkId, types, utils } from '@midnight-ntwrk/midnight-js';

// Ledger era vocabulary (named, not namespaced)
import { LEDGER_VERSIONS, type LedgerVersion } from '@midnight-ntwrk/midnight-js';

// Sub-path imports (individual modules)
import { ... } from '@midnight-ntwrk/midnight-js/contracts';
import { ... } from '@midnight-ntwrk/midnight-js/network-id';
import { ... } from '@midnight-ntwrk/midnight-js/types';
import { ... } from '@midnight-ntwrk/midnight-js/utils';
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
