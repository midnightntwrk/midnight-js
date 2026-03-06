# Network ID

Global network identifier management for Midnight.js runtime and ledger WASM API.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-network-id
```

## Quick Start

```typescript
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// Set the network ID (typically done once at app startup)
setNetworkId('testnet');

// Retrieve current network ID
const networkId = getNetworkId(); // 'testnet'
```

## API

### setNetworkId

Sets the global network identifier. Should be called once at application startup.

```typescript
setNetworkId(id: NetworkId): void
```

### getNetworkId

Retrieves the currently set global network identifier.

```typescript
getNetworkId(): NetworkId
```

**Throws:** `Error` if `setNetworkId()` has not been called.

### NetworkId

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

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
