# Contracts

Utilities for deploying and interacting with Midnight smart contracts.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-contracts
```

## Quick Start

```typescript
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

// Deploy a new contract
const deployed = await deployContract(providers, {
  compiledContract: myContract,
  privateStateId: 'my-state',
  initialPrivateState: { counter: 0n }
});

// Call a circuit on the deployed contract
const result = await deployed.callTx.myCircuit({ arg: 'value' });

// Find an existing deployed contract
const found = await findDeployedContract(providers, {
  compiledContract: myContract,
  contractAddress: '0x...',
  privateStateId: 'my-state'
});
```

## API

### deployContract

Creates and submits a contract deployment transaction.

```typescript
const deployed = await deployContract(providers, {
  compiledContract,          // Compiled Compact contract
  privateStateId,            // ID for storing private state (optional for stateless contracts)
  initialPrivateState,       // Initial private state (optional for stateless contracts)
  signingKey                 // Contract maintenance authority key (optional, auto-generated if omitted)
});
```

Returns a `DeployedContract` with:
- `deployTxData` - Deployment transaction data
- `callTx` - Interface for calling contract circuits
- `circuitMaintenanceTx` - Interface for circuit maintenance operations
- `contractMaintenanceTx` - Interface for contract maintenance operations

### findDeployedContract

Finds an existing deployed contract by address.

```typescript
const found = await findDeployedContract(providers, {
  compiledContract,          // Compiled Compact contract
  contractAddress,           // Address of deployed contract
  privateStateId,            // ID for retrieving/storing private state (optional)
  initialPrivateState,       // Private state to store (optional, uses existing if omitted)
  signingKey                 // Maintenance authority key (optional, auto-generated if needed)
});
```

### Transaction Submission

```typescript
import { submitCallTx, submitDeployTx, submitTx } from '@midnight-ntwrk/midnight-js-contracts';

// Submit a call transaction
await submitCallTx(providers, callOptions);

// Submit a deploy transaction
await submitDeployTx(providers, deployOptions);

// Generic transaction submission. Pass a transaction handle; it carries the era
// that wrote the transaction. submitTx reads the network's current ledger version and
// accepts only a transaction of that era.
const unprovenTx = LedgerTransaction.seal('v9', 'Unproven', ledgerUnprovenTx);
const record = await submitTx(providers, { unprovenTx });

// The record's tx is a FinalizedTx handle of the record's era.
const finalized = LedgerTransaction.unwrap(record.tx, record.era);
```

`LedgerTransaction` comes from `@midnight-ntwrk/midnight-js-types`. A handle you
get from `createUnprovenCallTx` or `createUnprovenDeployTx`
(`result.private.unprovenTx`) is already sealed, so you pass it on as it is.

`submitTx` reads the network's current ledger version once. The transaction's era must match it:

| input | network | what happens |
|---|---|---|
| v9 | v9 | proved, balanced and submitted as v9 handles |
| v8 | v8 | proved, balanced and submitted as v8 handles |
| v8 | v9 | refused with `EraArtifactMismatchError` before proving: the v9 ledger cannot read a v8 transaction |
| v9 | v8 | refused with `EraArtifactMismatchError` before proving |

It returns `FinalizedTxRead`, tagged with the era of the block that recorded the transaction.

### Maintenance Operations

```typescript
import {
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from '@midnight-ntwrk/midnight-js-contracts';

// Remove the verifier key a circuit holds, then insert one
await submitRemoveVerifierKeyTx(providers, compiledContract, contractAddress, 'increment');
const inserted = await submitInsertVerifierKeyTx(providers, compiledContract, contractAddress, 'increment', newVk);
inserted.public.status; // every result is { era, public }

// Replace contract maintenance authority; the new key is stored once the chain records it
await submitReplaceAuthorityTx(providers, compiledContract, contractAddress)(newSigningKey);
```

All three take either era's artifact. A ledger 8 artifact maintains a contract
only before the fork and answers `{ era: 'v8', public: Ledger8FinalizedTxData }`;
after the fork it is refused with `Ledger8.MaintenanceOnLedger9Error`, and the
same function with the recompiled ledger 9 artifact maintains the migrated
contract with the same stored key.

### State Queries

```typescript
import { getPublicStates, getStates, getUnshieldedBalances } from '@midnight-ntwrk/midnight-js-contracts';

// Get contract states (public + private)
const states = await getStates(
  providers.publicDataProvider,
  providers.privateStateProvider,
  contractAddress,
  privateStateId
);

// Get public states only
const publicStates = await getPublicStates(providers.publicDataProvider, contractAddress);

// Get unshielded token balances
const balances = await getUnshieldedBalances(providers.publicDataProvider, contractAddress);
```

`getStates` and `getPublicStates` return the public states as bytes: each of
`contractState`, `zswapChainState` and `ledgerParameters` is a `SerializedState`
with the `era` of the ledger that wrote it. Decode one with your own
runtime — the one your contract was compiled against — so your contract's
`ledger()` accepts the result:

```typescript
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { ledger } from './managed/counter/contract/index.js';

// Throws SerializedStateDecoderMissingError if the state was written by the v8 ledger.
const counter = ledger(publicStates.contractState.deserialize({ v9: ContractState }).data);
```

A contract that may predate the fork passes a decoder per era: `v8` with the
`ContractState` of the ledger 8 runtime, `v9` with the current one. See the indexer provider's
README, "Reading a contract that may predate the fork", for a contract compiled
with the ledger 8 toolchain.

### Transaction Interfaces

```typescript
import {
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterface,
  createContractMaintenanceTxInterface
} from '@midnight-ntwrk/midnight-js-contracts';
```

Each factory takes a ledger 8 or a ledger 9 contract and builds the interface for that contract's era:

```typescript
const callTx = createCircuitCallTxInterface(providers, compiledContract, contractAddress, privateStateId);
await callTx.increment();
```

### Utility Functions

```typescript
import { verifierKeysEqual, verifyContractState } from '@midnight-ntwrk/midnight-js-contracts';

// Compare verifier keys
const equal = verifierKeysEqual(keyA, keyB);

// Verify contract state matches expected verifier keys
verifyContractState(verifierKeys, contractState);
```

## Providers

Contract operations require a `ContractProviders` object (alias for `MidnightProviders`):

```typescript
type ContractProviders = {
  privateStateProvider: PrivateStateProvider;  // Private state storage
  publicDataProvider: PublicDataProvider;      // Blockchain data queries
  zkConfigProvider: ZKConfigProvider;          // ZK proving configuration
  proofProvider: ProofProvider;                // ZK proof generation
  walletProvider: WalletProvider;              // Transaction balancing
  midnightProvider: MidnightProvider;          // Transaction submission
  config: MidnightConfig;                      // Network id and transaction TTL
  loggerProvider?: LoggerProvider;             // Optional logging
};
```

## Type Names and Ledger Eras

A flat name such as `FoundContract<C>` picks the ledger 8 or ledger 9 variant
from the contract type, so `FoundContract<typeof MyContract>` is always the
type of the toolchain that compiled `MyContract`. The entry points return the
era-named type: `Ledger9FoundContract<C>` or `Ledger8FoundContract<C>`.

In generic code the contract is unknown, so name the era:

```typescript
const read = <C extends Contract.Any, K extends Contract.ProvableCircuitId<C>>(
  data: Ledger9FinalizedCallTxData<C, K>
) => data.public;
```

Types with no contract parameter have only their era-named form, for example
`Ledger9FinalizedMaintenanceTxData`. To accept either era, use the `AnyEra*`
unions.

## Exports

```typescript
import {
  // Deployment
  deployContract,
  DeployContractOptions,
  DeployedContract,

  // Finding contracts
  findDeployedContract,
  FindDeployedContractOptions,
  FoundContract,

  // Transaction submission
  submitCallTx,
  submitDeployTx,
  submitTx,
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx,

  // State queries
  getStates,
  getPublicStates,
  getUnshieldedBalances,

  // Transaction interfaces
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterface,
  createContractMaintenanceTxInterface,
  CircuitCallTxInterface,
  Ledger9CircuitMaintenanceTxInterface,
  Ledger9ContractMaintenanceTxInterface,

  // Utilities
  verifierKeysEqual,
  verifyContractState,

  // Types
  ContractProviders,
  CallOptions,
  CallResult,
  FinalizedDeployTxData,
  UnsubmittedCallTxData,
  UnsubmittedDeployTxData,

  // Errors
  CallTxFailedError,
  DeployTxFailedError,
  ContractTypeError,
  EraInvariantViolationError,
  TxFailedError
} from '@midnight-ntwrk/midnight-js-contracts';
```

## Architecture Documents

The reasoning behind this package's shape lives in `docs/`, not in the source
docstrings. Each file is registered with TypeDoc through `projectDocuments`, so
it is a page in the generated API reference and `@see {@link Title}` in a
docstring resolves to it.

| Document | What it explains |
|---|---|
| [Overload typing](./docs/overload-typing.md) | Why the retained-era contract types are hand-written, what discriminates the two toolchain eras, how openness is expressed without `any`, and why overload order is load-bearing |
| [Era dispatch](./docs/era-dispatch.md) | How an operation's pipeline era and the network's ledger version are each established, why the artifact check is structural rather than branded, and which pairings may run |
| [Verification path](./docs/verification-path.md) | What the pre-proving verifier-key check buys, and why routing on key generation is unavailable rather than unimplemented |
| [Keep-state pipeline](./docs/keep-state-pipeline.md) | The order one retained-era operation runs in, the two composition paths, per-recipient shielded encryption, provider-failure sanitization, and why a retained-era deploy is refused |
| [Fork crossed during an operation](./docs/stale-head-remediation.md) | How a submit rejection is told apart from a fork crossing, the two-step remediation it carries, and why a pre-fork contract-scoped transaction is refused outright |
| [Breadcrumbs](./docs/breadcrumbs.md) | Which era decisions reach the log and which deliberately do not, the four network version readings and their provenance, the privacy rule, and the one fault that is swallowed |
| [Error taxonomy](./docs/error-taxonomy.md) | Which class to catch across both eras, which errors register a code and which deliberately do not, the three refusals that fire before a caller pays, and the after-submission region the signing key rides through |

Docstrings in `src/` carry the API contract: what a symbol does, its
parameters, what it returns and what it throws. Anything that answers "why is
it built this way" belongs in a document above, stated once.

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
