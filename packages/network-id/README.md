# Network ID

Global network identifier management for Midnight.js applications. Required by the runtime and ledger WASM APIs to operate on the correct network.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-network-id
```

## Quick Start

```typescript
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// Set the network ID at application startup (required before any chain operations)
setNetworkId('testnet');

// Retrieve current network ID
const networkId = getNetworkId(); // 'testnet'
```

## Why Network ID Matters

The network identifier configures:

- **Transaction serialization** - Different networks may use different formats
- **Address derivation** - Addresses are network-specific
- **Contract deployment** - Contracts are deployed to specific networks
- **ZK proof generation** - Proofs are bound to network parameters

Setting the wrong network ID causes transactions to be rejected or addresses to be invalid.

## API

### setNetworkId

Sets the global network identifier. Call once at application startup before any blockchain operations.

```typescript
setNetworkId(id: NetworkId): void
```

**Parameters:**
- `id` - Network identifier string (e.g., `'testnet'`, `'mainnet'`)

### getNetworkId

Retrieves the currently configured network identifier.

```typescript
getNetworkId(): NetworkId
```

**Returns:** The current `NetworkId` value.

### NetworkId

Type alias for network identifiers.

```typescript
type NetworkId = string;
```

## Common Network Values

| Network | ID | Description |
|---------|-----|-------------|
| TestNet | `testnet` | Public test network |
| MainNet | `mainnet` | Production network |
| DevNet | `devnet` | Development network |
| Undeployed | `undeployed` | Default before configuration |

## Usage Patterns

### Application Initialization

Set network ID before initializing any providers:

```typescript
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

// 1. Set network first
setNetworkId('testnet');

// 2. Then configure providers
const providers = {
  privateStateProvider: levelPrivateStateProvider({ /* ... */ }),
  publicDataProvider: indexerPublicDataProvider(/* ... */),
  // ...
};
```

### Environment-Based Configuration

```typescript
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

const network = process.env.MIDNIGHT_NETWORK || 'testnet';
setNetworkId(network);
```

### Multi-Network Applications

For applications supporting multiple networks, set the network ID based on user selection:

```typescript
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

function switchNetwork(newNetwork: string) {
  const currentNetwork = getNetworkId();

  if (currentNetwork !== newNetwork) {
    setNetworkId(newNetwork);
    // Reinitialize providers for new network
    reinitializeProviders();
  }
}
```

## Error Handling

### Forgetting to Set Network ID

If you perform operations without setting the network ID, the default value `'undeployed'` is used, which will cause errors when interacting with real networks.

```typescript
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

function validateNetworkConfigured() {
  const networkId = getNetworkId();
  if (networkId === 'undeployed') {
    throw new Error('Network ID not configured. Call setNetworkId() at startup.');
  }
}
```

## Exports

```typescript
import {
  setNetworkId,
  getNetworkId,
  type NetworkId
} from '@midnight-ntwrk/midnight-js-network-id';
```

## Detailed

### Module-Level State

The network ID is stored as module-level state, preserved by the JavaScript module system:

```typescript
let currentNetworkId: NetworkId = 'undeployed';
```

This ensures:
- Single source of truth across the application
- Consistent behavior with WASM dependencies
- No need for dependency injection

### Integration with Other Packages

The network ID is consumed by:

| Package | Usage |
|---------|-------|
| `@midnight-ntwrk/compact-runtime` | Transaction building |
| `@midnight-ntwrk/ledger` | Address derivation |
| `@midnight-ntwrk/midnight-js-contracts` | Contract deployment |

These packages call `getNetworkId()` internally, so setting it once affects the entire application.

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
