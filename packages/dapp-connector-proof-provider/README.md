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
import { unwrapLedger9 } from '@midnight-ntwrk/midnight-js-types';

const proofProvider = await dappConnectorProofProvider(
  walletConnectedAPI,
  zkConfigProvider,
  costModel
);

// Transaction payloads are passed to a provider version-tagged: tag on the way
// in, narrow on `version` on the way out. There is no untagged form.
// `unwrapLedger9` is the framework's narrowing helper — it throws
// Ledger8PayloadUnsupportedError or UntaggedPayloadError, both carrying a stable
// `code` you can match with `hasErrorCode`.
const provenTx = unwrapLedger9(
  await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }),
  'proveTx'
);
```

### Wallet and midnight providers

```typescript
import { dappConnectorWalletProviders } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';

const { walletProvider, midnightProvider } = await dappConnectorWalletProviders(walletConnectedAPI);
```

`walletConnectedAPI` is the `ConnectedAPI` the wallet returned from `connect`. The factory reads the shielded keys once, from `getShieldedAddresses`. `balanceTx` calls `balanceUnsealedTransaction` and `submitTx` calls `submitTransaction`. The connector takes no TTL, so the `ttl` argument of `balanceTx` is not forwarded.

A wallet rejection (for example, the user declined) reaches your code unchanged, with the connector's own `code`. Two cases are refused with `InvalidArgumentError`:

- the wallet returns a transaction that is not a hex string;
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
import { unwrapLedger9 } from '@midnight-ntwrk/midnight-js-types';

const proofProvider = await dappConnectorProofProvider(
  walletConnectedAPI,
  zkConfigProvider,
  costModel
);

const provenTx = unwrapLedger9(
  await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }),
  'proveTx'
);
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
