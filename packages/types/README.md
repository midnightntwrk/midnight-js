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
  loggerProvider?: LoggerProvider;                      // Optional logging
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

### Version-tagged payloads

During the ledger-fork window every transaction crossing a provider seam is
tagged with the ledger runtime it belongs to. The two runtimes are separate WASM
instances, so a v8 object cannot be handed to the v9 runtime — `instanceof` does
not cross the boundary and duck-typing cannot tell them apart. An explicit tag is
the only mechanism available.

```typescript
interface V8TxBytes { readonly version: 'v8'; readonly txBytes: Uint8Array; }
interface V9Tx<T>   { readonly version: 'v9'; readonly tx: T; }
type VersionedTx<T> = V8TxBytes | V9Tx<T>;
```

There is deliberately no untagged arm, so a bare `Uint8Array` — bytes whose era
nobody can tell — is never assignable. `proveTx`, `balanceTx` and `submitTx`
carry these in both directions.

Narrow with `unwrapV9`, which reports a coded error instead of letting a bare
`TypeError` surface from inside a WASM call:

```typescript
import { unwrapV9 } from '@midnight-ntwrk/midnight-js-types';

const provenTx = unwrapV9(await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }), 'proveTx');
```

Its `seam` parameter is a `ProviderSeam`, so it covers those three methods only.
The read surface reports a *different* union, `VersionedFinalizedTxData`, whose
v8 arm carries `tx` rather than `txBytes` — narrow that one with
`switch (record.version)`.

**Implementing `WalletProvider` or `MidnightProvider`?** Wrap a v9-only
implementation rather than tagging by hand:

```typescript
import { createMidnightProvider, createWalletProvider } from '@midnight-ntwrk/midnight-js-types';

const walletProvider = createWalletProvider({
  balanceTx: (tx, ttl) => wallet.balanceAndProveTransaction(tx, ttl),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});
const midnightProvider = createMidnightProvider((tx) => wallet.submitTransaction(tx));
```

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
  version: 'v9';
  tx: Transaction;
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
  V8PayloadUnsupportedError,
  UntaggedPayloadError,
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

  // Version-tagged payloads for the ledger-fork window
  type V8TxBytes,
  type V9Tx,
  type VersionedTx,
  type VersionedUnprovenTransaction,
  type VersionedUnboundTransaction,
  type VersionedFinalizedTransaction,
  type FinalizedTxRecord,
  type FinalizedTxDataV8,
  type VersionedFinalizedTxData,
  type ProviderSeam,
  type ReadSeam,
  type Seam,
  unwrapV9,

  // Private state types
  type PrivateStateId,

  // Logger types
  LogLevel,

  // Errors
  V8PayloadUnsupportedError,
  UntaggedPayloadError,
  InvalidProtocolSchemeError,
  PrivateStateExportError,
  SigningKeyExportError,
  PrivateStateImportError,
  ExportDecryptionError,
  InvalidExportFormatError,
  ImportConflictError,

  // Factory functions
  type V9WalletProvider,
  createWalletProvider,
  createMidnightProvider,
  createProofProvider,

  // Re-exports
  Transaction
} from '@midnight-ntwrk/midnight-js-types';
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
