# DApp Connector Proof Provider

Proof provider implementation that delegates zero-knowledge proof generation to a DApp Connector wallet. Use this when your dApp runs in a browser and the user's wallet handles proving.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-dapp-connector-proof-provider
```

## Quick Start

```typescript
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';

const proofProvider = await dappConnectorProofProvider(
  walletConnectedAPI,
  zkConfigProvider,
  costModel
);

const provenTx = await proofProvider.proveTx(unprovenTx);
```

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
  type DAppConnectorProvingAPI
} from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
