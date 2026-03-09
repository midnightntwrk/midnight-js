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

Sets the global network identifier. Should be called once at application startup.

```typescript
setNetworkId(id: NetworkId): void
```

**Parameters:**
- `id` - Network identifier string (e.g., `'testnet'`)

### getNetworkId

Retrieves the currently set global network identifier.

```typescript
getNetworkId(): NetworkId
```

**Throws:** `Error` if `setNetworkId()` has not been called.

### NetworkId

Type alias for network identifiers.

```typescript
type NetworkId = string;
```

## Important

The network ID **must** be configured before using any SDK functionality. Calling `getNetworkId()` before `setNetworkId()` will throw:

```
Error: Network ID has not been configured. Call setNetworkId() before any wallet or contract operation.
```

## Exports

```typescript
import {
  setNetworkId,
  getNetworkId,
  type NetworkId
} from '@midnight-ntwrk/midnight-js-network-id';
```

## Implementation Details

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

Within this monorepo, the network ID is consumed by:

| Package | Usage |
|---------|-------|
| `@midnight-ntwrk/midnight-js-contracts` | Transaction building and contract deployment |
| `@midnight-ntwrk/midnight-js-utils` | Type imports |

These packages call `getNetworkId()` internally, so setting it once affects the entire application.

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
