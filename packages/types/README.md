# Types

Shared data types, interfaces, and provider contracts for all Midnight.js modules.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-types
```

## Quick Start

```typescript
import {
  type MidnightProviders,
  type FinalizedTxData,
  type FinalizedTxRecord,
  type TxStatus,
  SucceedEntirely,
  FailFallible,
  FailEntirely
} from '@midnight-ntwrk/midnight-js-types';
```

## Provider Interfaces

### MidnightProviders

The main provider interface required for transaction construction and submission:

```typescript
interface MidnightProviders<PCK, PSI, PS> {
  privateStateProvider: PrivateStateProvider<PSI, PS>;  // Private state management
  publicDataProvider: PublicDataProvider;               // Blockchain data queries
  zkConfigProvider: ZKConfigProvider<PCK>;              // ZK artifact retrieval
  proofProvider: ProofProvider;                         // ZK proof generation
  walletProvider: WalletProvider;                       // Transaction balancing
  midnightProvider: MidnightProvider;                   // Transaction submission
  config: MidnightConfig;                               // Network id and transaction TTL
  loggerProvider?: LoggerProvider;                      // Optional logging
}

interface MidnightConfig {
  networkId: NetworkId;   // e.g. 'preview' or 'undeployed'
  ttlSeconds: number;     // how long a built transaction stays valid, positive whole seconds
}
```

### Individual Provider Interfaces

| Interface              | Description                              |
| ---------------------- | ---------------------------------------- |
| `PrivateStateProvider` | Private state and signing key storage    |
| `PublicDataProvider`   | Blockchain state and transaction queries |
| `ZKConfigProvider`     | Prover keys, verifier keys, ZKIR         |
| `ProofProvider`        | ZK proof generation                      |
| `WalletProvider`       | Transaction balancing and signing        |
| `MidnightProvider`     | Transaction submission to network        |
| `LoggerProvider`       | Logging utilities                        |

## ZK Artifacts

### Types

```typescript
type ProverKey = Uint8Array & { readonly ProverKey: unique symbol };
type VerifierKey = Uint8Array & { readonly VerifierKey: unique symbol };
type ZKIR = Uint8Array & { readonly ZKIR: unique symbol };

interface ZKConfig<K extends string> {
  circuitId: K;
  proverKey: ProverKey;
  verifierKey: VerifierKey;
  zkir: ZKIR;
}
```

### Factory Functions

```typescript
createProverKey(uint8Array: Uint8Array): ProverKey
createVerifierKey(uint8Array: Uint8Array): VerifierKey
createZKIR(uint8Array: Uint8Array): ZKIR
```

## Transaction Types

### Transaction handles

Every transaction passed to a provider method is a **transaction handle**: an
opaque object that holds one ledger transaction, the ledger era it belongs to
(`'v8'` or `'v9'`) and the stage it has reached. The stage is part of the type:

```typescript
type UnprovenTx = LedgerTransaction<'Unproven'>;   // before proving
type UnboundTx = LedgerTransaction<'Unbound'>;     // proven, not yet bound
type FinalizedTx = LedgerTransaction<'Finalized'>; // proven and bound, ready to submit
```

The three provider methods take and return handles:

```typescript
proofProvider.proveTx(tx: UnprovenTx): Promise<UnboundTx>;
walletProvider.balanceTx(tx: UnboundTx, ttl?: Date): Promise<FinalizedTx>;
midnightProvider.submitTx(tx: FinalizedTx): Promise<TransactionId>;
```

Passing a handle at the wrong stage — an unproven handle to
`MidnightProvider.submitTx`, for example — is a compile error.

There are two ways in and out of a handle:

- `LedgerTransaction.seal(era, stage, tx)` makes a handle. It refuses a ledger
  object that does not come from the ledger copy this framework loaded (a
  second install of the ledger package is a second WASM instance, and its
  objects break inside the framework's WASM calls). The refusal is
  `ForeignLedgerTransactionError`.
- `LedgerTransaction.unwrap(handle, era)` reads the ledger object back. It
  refuses a handle of another era with `TransactionEraMismatchError`.

```typescript
import { LedgerTransaction, type UnprovenTx } from '@midnight-ntwrk/midnight-js-types';

const unprovenTx: UnprovenTx = LedgerTransaction.seal('v9', 'Unproven', ledgerUnprovenTx);
const provenTx = await proofProvider.proveTx(unprovenTx);
const ledgerProvenTx = LedgerTransaction.unwrap(provenTx, 'v9');
```

A handle also has `era`, `stage` and `serialize()`, so you can route it or
send its bytes without unwrapping it.

To seal a v8 transaction, build it with the module that `loadLedger8Protocol()`
from `@midnight-ntwrk/midnight-js-protocol` returns, after awaiting that call.
Before that, `seal` cannot check a v8 object and refuses it with reason
`ledger8-not-loaded`.

A finalized-transaction record from the read side (`watchForTxData`,
`watchForDeployTxData`) is a `FinalizedTxRead`. It names its era `era`, like a
handle and a state, and its `tx` is a `FinalizedTx` of that same era. Read it
like this:

```typescript
const record = await publicDataProvider.watchForTxData(txId);
const tx = LedgerTransaction.unwrap(record.tx, record.era);
```

A contract state, ledger parameters and a zswap chain state come back as a
`LedgerState`: the bytes, plus the `era` of the ledger that wrote them.
Decode one with the runtime your contract was compiled against, so its
`ledger()` accepts the result:

```typescript
import { ContractState } from '@midnight-ntwrk/compact-runtime';

const read = await publicDataProvider.queryContractState(contractAddress);
if (read !== null) {
  const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
}
```

`deserialize` calls only the decoder for the state's own `era`. It refuses a
missing one with `LedgerStateDecoderMissingError`, and reports a decoder that
throws as `LedgerStateDecodeFailedError` (a decoder error that already has a
midnight-js code is rethrown unchanged). Its return type is `unknown` when you
pass no decoder for any era the state can be. Only `LedgerState.fromBytes(era, kind, bytes)`
makes a `LedgerState`; `LedgerState.isLedgerState(value)` checks one.

**Implementing `WalletProvider` or `MidnightProvider`?** Wrap a v9-only
implementation. Both adapters unwrap each handle for you, and the wallet adapter
also seals its answer:

```typescript
import { deserializeTransactionAtStage } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import { createMidnightProvider, createWalletProvider } from '@midnight-ntwrk/midnight-js-types';

// The wallet runs its own copy of the ledger, so transactions cross as bytes.

const walletProvider = createWalletProvider({
  balanceTx: async (tx, ttl) =>
    deserializeTransactionAtStage('v9', 'Finalized', await wallet.balanceTransaction(tx.serialize(), ttl)),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});
const midnightProvider = createMidnightProvider((tx) => wallet.submitTransaction(tx.serialize()));
```

### Declaring the eras a provider serves

The three transaction providers each carry a required `supportedEras` list. It is
read BEFORE an operation starts, so a provider set that cannot carry a
transaction end to end is refused with `ProviderEraUnsupportedError` rather than
after a proof has been paid for.

```typescript
interface ProofProvider {
  readonly supportedEras: readonly LedgerVersion[];
  proveTx(unprovenTx: UnprovenTx, config?: ProveTxConfig): Promise<UnboundTx>;
}
```

The three `create*Provider` adapters above declare `['v9']` — each lifts a
v9-only implementation, so that is the honest answer and it needs no change from
you.

**Serving more than one era?** Write one handler per era and let the factory
assemble the provider. There is one key per ledger era: a handler for an era
you serve, `undefined` for one you do not. The factory unwraps each handle for
the handler of its era, seals a transaction answer (`proveTx`, `balanceTx`) in
that same era, and refuses an era you did not supply. `supportedEras` is computed from the handlers, so it cannot
disagree with what the provider does:

```typescript
import { createProofProviderFromHandlers } from '@midnight-ntwrk/midnight-js-types';
import { proveLedger8Transaction } from '@midnight-ntwrk/midnight-js-protocol/prove';

const proofProvider = createProofProviderFromHandlers({
  v8: (tx) => proveLedger8Transaction(tx, ledger8ProvingProvider),
  v9: (tx) => tx.prove(provingProvider, CostModel.initialCostModel())
});
// proofProvider.supportedEras is ['v8', 'v9']
```

Every handler gets a live ledger object of its own era and returns one. A
handler that hands the transaction to another ledger copy — a wallet SDK, a
DApp Connector wallet — serializes it on the way out and decodes the answer with
`deserializeTransactionAtStage(era, stage, bytes)` from
`@midnight-ntwrk/midnight-js-protocol/transaction` on the way in. Take the era
from the request, never from the answer's bytes.

A provider with no handler at all is refused when it is built. The factory also
checks the handlers then, for JavaScript callers the types do not reach: a
handler that is neither a function nor `undefined` is refused with
`UnusableEraEntryError` (`MIDNIGHT_JS_PR_UNUSABLE_ERA_ENTRY`), and a missing
era key with `InvalidArgumentError`. The check is shape only: a handler built
for the wrong era still passes. The provider serves from a copy of the handlers
taken then, so replacing a handler on the object you passed in afterwards has
no effect.

`createWalletProviderFromHandlers` and `createMidnightProviderFromHandlers` are the same
shape for the other two providers. Implementing an interface directly is also
fine — a class, or a provider that routes internally — in which case you write
`supportedEras` yourself and unwrap and seal the handles yourself.

Nothing verifies the declaration. A provider built from handlers still refuses
a handle of an era it has no handler for with `ProviderEraUnsupportedError`, so
declaring an era you do not serve makes a failure later, not absent.

### TxStatus

```typescript
const SucceedEntirely = 'SucceedEntirely';  // All segments succeeded
const FailFallible = 'FailFallible';        // Guaranteed succeeded, fallible failed
const FailEntirely = 'FailEntirely';        // Transaction invalid

type TxStatus = typeof SucceedEntirely | typeof FailFallible | typeof FailEntirely;
```

### SegmentStatus

```typescript
const SegmentSuccess = 'SegmentSuccess';
const SegmentFail = 'SegmentFail';

type SegmentStatus = typeof SegmentSuccess | typeof SegmentFail;
```

### FinalizedTxData

```typescript
interface FinalizedTxData {
  era: 'v9';
  tx: FinalizedTx;      // a handle of the same era: tx.era === era
  status: TxStatus;
  txId: TransactionId;
  identifiers: readonly TransactionId[];
  txHash: TransactionHash;
  blockHash: BlockHash;
  blockHeight: number;
  blockTimestamp: number;
  blockAuthor: string | null;
  indexerId: number;
  protocolVersion: number;
  fees: Fees;
  segmentStatusMap: Map<number, SegmentStatus> | undefined;
  unshielded: UnshieldedUtxos;
}
```

## Balance Types

```typescript
type UnshieldedUtxo = {
  owner: ContractAddress;
  intentHash: IntentHash;
  tokenType: RawTokenType;
  value: bigint;
}

type UnshieldedUtxos = {
  created: readonly UnshieldedUtxo[];
  spent: readonly UnshieldedUtxo[];
}

type UnshieldedBalance = {
  balance: bigint;
  tokenType: RawTokenType;
}

type UnshieldedBalances = UnshieldedBalance[];
```

## Errors

```typescript
import {
  ForeignLedgerTransactionError,
  InvalidTransactionHandleError,
  TransactionEraMismatchError,
  InvalidLedgerStateError,
  LedgerStateDecoderMissingError,
  LedgerStateDecodeFailedError,
  ProviderEraUnsupportedError,
  UnusableEraEntryError,
  InvalidProtocolSchemeError,
  PrivateStateExportError,
  SigningKeyExportError,
  PrivateStateImportError,
  ExportDecryptionError,
  InvalidExportFormatError,
  ImportConflictError
} from '@midnight-ntwrk/midnight-js-types';
```

## Exports

```typescript
import {
  // Provider interfaces
  type MidnightProviders,
  type PrivateStateProvider,
  type PublicDataProvider,
  type ZKConfigProvider,
  type ProofProvider,
  type WalletProvider,
  type MidnightProvider,
  type LoggerProvider,

  // ZK types
  type ProverKey,
  type VerifierKey,
  type ZKIR,
  type ZKConfig,
  createProverKey,
  createVerifierKey,
  createZKIR,
  zkConfigToProvingKeyMaterial,

  // Transaction types
  type FinalizedTxData,
  type FinalizedTxRecord,
  type TxStatus,
  type SegmentStatus,
  SucceedEntirely,
  FailFallible,
  FailEntirely,
  SegmentSuccess,
  SegmentFail,

  // Balance types
  type UnshieldedUtxo,
  type UnshieldedUtxos,
  type UnshieldedBalance,
  type UnshieldedBalances,
  type Fees,
  type BlockHash,

  // Transaction handles
  LedgerTransaction,
  type UnprovenTx,
  type UnboundTx,
  type FinalizedTx,
  type TransactionStage,
  type LedgerTransactionTypes,

  // On-chain state as bytes, decoded by the caller's own runtime
  LedgerState,
  type LedgerStateKind,
  type StateDecoder,
  type StateDecoders,
  type DecodedState,
  type ContractStateRead,
  type ContractStateAndParametersRead,
  type PublicStatesRead,
  type InvalidLedgerStateReason,

  // Version-tagged transaction records for the ledger-fork window
  type Ledger8FinalizedTxData,
  type FinalizedTxRead,
  type TransactionMethod,
  type ReadMethod,
  type ProviderMethod,

  // The eras a provider serves
  type EraDeclaringProvider,
  type TransactionProviders,
  assertProvidersSupportEra,

  // Private state types
  type PrivateStateId,

  // Logger types
  LogLevel,

  // Errors
  ForeignLedgerTransactionError,
  InvalidTransactionHandleError,
  TransactionEraMismatchError,
  InvalidLedgerStateError,
  LedgerStateDecoderMissingError,
  LedgerStateDecodeFailedError,
  ProviderEraUnsupportedError,
  UnusableEraEntryError,
  InvalidProtocolSchemeError,
  PrivateStateExportError,
  SigningKeyExportError,
  PrivateStateImportError,
  ExportDecryptionError,
  InvalidExportFormatError,
  ImportConflictError,

  // Factory functions
  type Ledger9WalletProvider,
  createWalletProvider,
  createMidnightProvider,
  createProofProvider,
  createProofProviderFromProvingProviders,
  type ProvingProvidersByEra,
  type ProofProviderHandlers,
  type WalletProviderHandlers,
  type MidnightProviderHandlers,
  createProofProviderFromHandlers,
  createWalletProviderFromHandlers,
  createMidnightProviderFromHandlers,

  // Re-exports
  Transaction
} from '@midnight-ntwrk/midnight-js-types';
```

## Architecture Documents

The reasoning behind this package's shape lives in `docs/`, not in the source
docstrings. Each file is registered with TypeDoc through `projectDocuments`, so
it is a page in the generated API reference and `@see {@link Title}` in a
docstring resolves to it.

| Document | What it explains |
|---|---|
| [Version-tagged payloads](./docs/version-tagged-payloads.md) | Why a transaction crosses a provider method as a handle, what the guard in `seal` checks, the three things the `era` of a read result deliberately does not establish, and why ledger parameters travel with the state |
| [Provider era declarations](./docs/provider-era-declarations.md) | Why `supportedEras` is read before an operation starts and still not trusted, why the two era refusals stay distinct, and what the lifting adapters exist to avoid |
| [Reading the network's ledger version](./docs/reading-the-head-era.md) | The caching rule `queryLatestProtocolVersion` imposes, why it takes no force-refresh option, and when to prefer the `protocolVersion` a read already carries |

Docstrings in `src/` carry the API contract: what a symbol does, its
parameters, what it returns and what it throws. Anything that answers "why is
it built this way" belongs in a document above, stated once.

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
