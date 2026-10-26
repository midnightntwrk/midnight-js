# DApp Connector Proof Provider

Providers that delegate to a DApp Connector wallet (for example Lace). Use this package when your dApp runs in a browser and the user's wallet proves, balances and submits transactions.

- `dappConnectorProofProvider` builds the `ProofProvider`.
- `dappConnectorWalletProviders` builds the `WalletProvider` and the `MidnightProvider`.

All three serve ledger 8 and ledger 9 transactions.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-dapp-connector-proof-provider
```

## Quick Start

```typescript
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { LedgerTransaction } from '@midnight-ntwrk/midnight-js-types';

const proofProvider = await dappConnectorProofProvider(
  walletConnectedAPI,
  zkConfigProvider,
  costModel
);

// A transaction is passed to a provider as a handle that carries its era.
// The proven handle comes back in the same era.
const unprovenTx = LedgerTransaction.seal('v9', 'Unproven', ledgerUnprovenTx);
const provenTx = await proofProvider.proveTx(unprovenTx);
const ledgerProvenTx = LedgerTransaction.unwrap(provenTx, 'v9');
```

### Wallet and midnight providers

```typescript
import { dappConnectorWalletProviders } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';

const { walletProvider, midnightProvider } = await dappConnectorWalletProviders(walletConnectedAPI);
```

`walletConnectedAPI` is the `ConnectedAPI` the wallet returned from `connect`. The factory reads the shielded keys once, from `getShieldedAddresses`. `balanceTx` calls `balanceUnsealedTransaction` and `submitTx` calls `submitTransaction`.

The wallet runs its own copy of the ledger, so the transaction crosses as bytes: each handler serializes the transaction for the wallet, and `balanceTx` decodes the wallet's answer into the framework's ledger copy with `deserializeTransactionAtStage`. The era for that decode is the era of the handle you passed in, never a guess from the bytes.

**Known limit: no TTL.** The connector takes no TTL, so the `ttl` argument of `balanceTx` is not forwarded. The wallet picks the expiry, and `config.ttlSeconds` has no effect on the intents it adds. See [midnight-dapp-connector-api#102](https://github.com/midnightntwrk/midnight-dapp-connector-api/issues/102).

A wallet rejection (for example, the user declined) leaves `balanceTx` and `submitTx` unchanged, with the connector's own `code`. `deployContract` and the `callTx` functions wrap it in `ProviderFailedError`, and that copy does not keep the `code`.

Three cases are refused with `InvalidArgumentError`:

- the wallet answer is not even-length hex without a `0x` prefix;
- the wallet answer is not a balanced transaction of the requested ledger;
- `submitTx` gets a transaction without an identifier. This is checked before anything is submitted.

## Configuration

| Parameter          | Required | Description                                         |
| ------------------ | -------- | --------------------------------------------------- |
| `api`              | ✓        | DApp Connector wallet API with proving capabilities |
| `zkConfigProvider` | ✓        | Provider for ZK configuration artifacts             |
| `costModel`        | ✓        | Cost model for transaction proving                  |

## Architecture

This package provides two abstraction levels for wallet-delegated proof generation:

```
ProofProvider (dappConnectorProofProvider) - Transaction-level
    ↓ uses internally
ProvingProvider (dappConnectorProvingProvider) - Circuit-level
    ↓ delegates to
DApp Connector Wallet (getProvingProvider)
```

### High-Level: Transaction Proving

Use `dappConnectorProofProvider` for most use cases. It wraps the wallet's proving capabilities with a cost model to handle complete transactions.

```typescript
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';

const proofProvider = await dappConnectorProofProvider(
  walletConnectedAPI,
  zkConfigProvider,
  costModel
);

const provenTx = await proofProvider.proveTx(unprovenTx);
```

### Low-Level: Circuit Proving

Use `dappConnectorProvingProvider` for advanced scenarios requiring direct access to the wallet's proving provider without cost model integration.

```typescript
import { dappConnectorProvingProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';

const provingProvider = await dappConnectorProvingProvider(
  walletConnectedAPI,
  zkConfigProvider
);
```

## API

### ProofProvider (High-Level)

```typescript
dappConnectorProofProvider<K extends string>(
  api: DAppConnectorProvingAPI,
  zkConfigProvider: ZKConfigProvider<K>,
  costModel: CostModel
): Promise<ProofProvider>
```

Creates a `ProofProvider` that delegates proving to the wallet and applies the given cost model. The wallet's proving provider is obtained once during initialization and reused for all subsequent `proveTx` calls.

### ProvingProvider (Low-Level)

```typescript
dappConnectorProvingProvider<K extends string>(
  api: DAppConnectorProvingAPI,
  zkConfigProvider: ZKConfigProvider<K>
): Promise<ProvingProvider>
```

Obtains a `ProvingProvider` directly from the DApp Connector wallet. Extracts key material from the ZK config provider and passes it to the wallet's `getProvingProvider` method.

### Wallet and midnight providers

```typescript
dappConnectorWalletProviders(
  api: DAppConnectorWalletAPI
): Promise<{ walletProvider: WalletProvider; midnightProvider: MidnightProvider }>
```

Creates a `WalletProvider` and a `MidnightProvider` that balance and submit through the wallet. Both have `supportedEras` `['v8', 'v9']`.

### DAppConnectorWalletAPI

```typescript
type DAppConnectorWalletAPI = Pick<
  ConnectedAPI,
  'getShieldedAddresses' | 'balanceUnsealedTransaction' | 'submitTransaction'
>
```

The methods `dappConnectorWalletProviders` needs. A test can pass an object with only these three.

### DAppConnectorProvingAPI

```typescript
type DAppConnectorProvingAPI = Pick<WalletConnectedAPI, 'getProvingProvider'>
```

Minimal interface required from the DApp Connector wallet. Only the `getProvingProvider` method is needed, allowing loose coupling to the full wallet API.

## Exports

```typescript
import {
  // High-level: Transaction proving
  dappConnectorProofProvider,

  // Low-level: Circuit proving
  dappConnectorProvingProvider,
  type DAppConnectorProvingAPI,

  // Transaction balancing and submission
  dappConnectorWalletProviders,
  type DAppConnectorWalletAPI
} from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
