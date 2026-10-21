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

// Generic transaction submission. Tag the transaction with the era that wrote it;
// submitTx reads the network head and accepts only a transaction of the head's era.
await submitTx(providers, { unprovenTx: { version: 'v9', tx: unprovenTx } });
await submitTx(providers, { unprovenTx: { version: 'v8', txBytes } });
```

`submitTx` reads the network head once. The transaction's era must match it:

| input | head | what happens |
|---|---|---|
| v9 | v9 | proved, balanced and submitted as v9 payloads |
| v8 | v8 | proved, balanced and submitted as v8 payloads |
| v8 | v9 | refused with `EraArtifactMismatchError` before proving: the v9 ledger cannot read v8 bytes |
| v9 | v8 | refused with `EraArtifactMismatchError` before proving |

It returns `VersionedFinalizedTxData`, tagged with the head's era.

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
only on a pre-fork head and answers `{ era: 'v8', public: Ledger8FinalizedTxData }`;
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

`getStates` and `getPublicStates` return the states tagged with the ledger era
that wrote them (`version: 'v8' | 'v9'`). A v9 block's states are decoded; a v8
block's contract state and ledger parameters come back as the stored bytes
(`stateBytes`, `ledgerParametersBytes`). Narrow on `version`, or use
`requireLedger9` from `@midnight-ntwrk/midnight-js-utils` when your code handles
only v9:

```typescript
import { requireLedger9 } from '@midnight-ntwrk/midnight-js-utils';

const { contractState, ledgerParameters } = requireLedger9(publicStates, 'readCounter');
```

To decode a contract state of either era, use `getAnyEraContractState`:

```typescript
import { getAnyEraContractState } from '@midnight-ntwrk/midnight-js-contracts';
// `StateValue` and the contract class both come from YOUR OWN generated contract
// module and its Compact runtime — not from the framework. That is the point:
// `read.state` is plain data precisely so your runtime can accept it.
import { StateValue } from './managed/counter/contract/index.cjs';
import { Counter } from './managed/counter/contract/index.cjs';

const read = await getAnyEraContractState(providers.publicDataProvider, contractAddress);

if (read !== null) {
  // `read.version` is the era that WROTE the bytes, read off the
  // envelope — not the era of the block that dated the read.
  // `read.state` is encoded, so decode it with your own contract's runtime.
  const ledgerState = Counter.ledger(StateValue.decode(read.state));
}
```

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
  getAnyEraContractState,
  getUnshieldedBalances,

  // Transaction interfaces
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterface,
  createContractMaintenanceTxInterface,
  CircuitCallTxInterface,
  CircuitMaintenanceTxInterface,
  ContractMaintenanceTxInterface,

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
| [Era dispatch](./docs/era-dispatch.md) | How an operation's pipeline era and the network head era are each established, why the artifact check is structural rather than branded, and which pairings may run |
| [Verification path](./docs/verification-path.md) | What the pre-proving verifier-key check buys, and why routing on key generation is unavailable rather than unimplemented |
| [Keep-state pipeline](./docs/keep-state-pipeline.md) | The order one retained-era operation runs in, the two composition paths, per-recipient shielded encryption, provider-failure sanitization, and why a retained-era deploy is refused |
| [Stale-head remediation](./docs/stale-head-remediation.md) | How a submit rejection is told apart from a fork crossing, the two-step remediation it carries, and why a pre-fork contract-scoped transaction is refused outright |
| [Breadcrumbs](./docs/breadcrumbs.md) | Which era decisions reach the log and which deliberately do not, the four head readings and their provenance, the privacy rule, and the one fault that is swallowed |
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
