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
  LEDGER_VERSIONS,    // the closed, frozen set: ['v8', 'v9']
  type LedgerVersion, // 'v8' | 'v9'
  versionOfRecord,    // a record carrying protocolVersion -> LedgerVersion
  networkHeadVersion  // asks a source for the network head -> LedgerVersion
} from '@midnight-ntwrk/midnight-js';
```

Use `versionOfRecord` for a `protocolVersion` read off an existing record, and
`networkHeadVersion` for the era a transaction built now would land in. Each
tags its failures with the path it was called on, so a handler can tell the two
apart.

Both refuse rather than guess. They raise `UnknownProtocolVersionError` when a
`protocolVersion` is malformed (not a non-negative integer) or is well-formed
but maps to no era this build knows. `versionOfRecord` throws;
`networkHeadVersion` is `async`, so it rejects instead, and a rejection from
the source itself propagates unchanged.

```typescript
import {
  type ProtocolVersionUnknownReason,
  UnknownProtocolVersionError,
  versionOfRecord,
  type VersionResolutionPath
} from '@midnight-ntwrk/midnight-js';

// Any record carrying a raw protocolVersion -- e.g. a transaction or block
// already read from the indexer. Node major 9 is one this build has no era
// for, so this record takes the failure path.
const record = { protocolVersion: 9_000_000 };

try {
  const era = versionOfRecord(record);
  console.log(`this record was written under ledger ${era}`);
} catch (error) {
  // Anything that is not ours is not ours to interpret. Never swallow it.
  if (!(error instanceof UnknownProtocolVersionError)) {
    throw error;
  }

  const path: VersionResolutionPath = error.path;            // 'read' | 'construct'
  const reason: ProtocolVersionUnknownReason = error.reason; // 'unknown' | 'malformed'

  throw new Error(
    reason === 'unknown'
      ? `This record is from a ledger era this build does not know (${path} path). Upgrade midnight-js.`
      : `The protocolVersion handed to versionOfRecord was malformed (${path} path). Check the source record.`,
    { cause: error }
  );
}
```

Both eras are worth handling explicitly, because the two reasons need different
responses: `'unknown'` means this framework build predates the network, and
`'malformed'` means the wrong field was wired into the resolver.

If you would rather discriminate on a stable string than on a class, every
error here also carries a `code`. `PROTOCOL_ERROR_CODES` names them and
`utils.hasErrorCode` is the guard:

```typescript
import { PROTOCOL_ERROR_CODES, utils } from '@midnight-ntwrk/midnight-js';

if (utils.hasErrorCode(error, PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ)) {
  // the era of an existing record could not be resolved
}
```

### Errors from the retained era

Deploying to or calling a `v8` contract runs through the retained pre-fork
pipeline, which raises errors of its own. The barrel publishes those classes
too, so you can catch them and read their payload without a cast:

| Class | Payload | Means |
| ----- | ------- | ----- |
| `Ledger8RuntimeMissingError` | `subpath` | the retained runtime chunk could not be loaded at all |
| `ComposeFailedError` | `version`, `stage`, `circuitId` | a circuit operation is missing or under-registered |
| `ComposeOptionError` | `version`, `option` | one composition option cannot be used |
| `StateDecodeFailedError` | `version` | a contract-state envelope could not be read as that era |
| `UnknownLedgerVersionError` | `requestedVersion` | an era outside `LEDGER_VERSIONS` was requested |
| `PayloadNotATransactionError` | none | a `v8` payload sent for proving was not a transaction |

### What importing the barrel loads

The retained pre-fork (`v8`) ledger runtime is **not** re-exported here, and it
is absent from the barrel's static import graph. It is loaded on demand, only
once you actually touch a `v8` contract.

Importing the barrel is not otherwise free: it pulls the `v9` ledger and
onchain-runtime, because `contracts` needs them. The sub-path imports below let
you take one module without the rest.

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
