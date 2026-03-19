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

  // Private state types
  type PrivateStateId,

  // Logger types
  LogLevel,

  // Errors
  InvalidProtocolSchemeError,
  PrivateStateExportError,
  SigningKeyExportError,
  PrivateStateImportError,
  ExportDecryptionError,
  InvalidExportFormatError,
  ImportConflictError,

  // Factory functions
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
