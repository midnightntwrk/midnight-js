# Network ID

> **Deprecated since 5.0.0. Removed in 6.0.**
> The framework no longer reads the value set here. Pass the network id on your
> provider set as `MidnightProviders.config.networkId` instead, and import the
> `NetworkId` type from `@midnight-ntwrk/midnight-js-types`.

## Migration

```typescript
// Before (4.x)
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

setNetworkId('preview');
const providers = { privateStateProvider, publicDataProvider, zkConfigProvider, proofProvider, walletProvider, midnightProvider };

// After (5.0.0)
const providers = {
  privateStateProvider, publicDataProvider, zkConfigProvider, proofProvider, walletProvider, midnightProvider,
  config: { networkId: 'preview', ttlSeconds: 3600 }
};
```

`ttlSeconds: 3600` keeps the one-hour transaction TTL that 4.x used. See the
[5.0.0 migration guide](../../docs/releases/v5.0.0/migration-guide.md).

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-network-id
```

## API

All three exports still compile and run, so code that calls them keeps working
until 6.0. None of them affects the framework.

### setNetworkId

```typescript
setNetworkId(id: NetworkId): void
```

Stores a process-wide network id.

### getNetworkId

```typescript
getNetworkId(): NetworkId
```

Returns the stored network id.

**Throws:** `Error` if `setNetworkId()` has not been called.

### NetworkId

Re-exported from `@midnight-ntwrk/midnight-js-types`:

```typescript
type NetworkId = string;
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
