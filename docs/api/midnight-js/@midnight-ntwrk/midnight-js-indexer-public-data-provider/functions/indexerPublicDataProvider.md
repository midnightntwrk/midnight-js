[**Midnight.js API Reference v5.0.0-alpha.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / indexerPublicDataProvider

# Function: indexerPublicDataProvider()

## Call Signature

> **indexerPublicDataProvider**(`config`): [`IndexerPublicDataProvider`](../classes/IndexerPublicDataProvider.md)

Constructs an indexer-backed `PublicDataProvider`.

Two call forms:
1. Object-config (preferred): `indexerPublicDataProvider({ queryURL, subscriptionURL, webSocket?, pollInterval? })`.
2. Positional (deprecated, retained for backward compatibility): `indexerPublicDataProvider(queryURL, subscriptionURL, webSocket?)`.

The returned concrete `IndexerPublicDataProvider` exposes `dispose()` to
release the WebSocket connection and Apollo state. Always call it on
long-running providers.

### Parameters

#### config

[`IndexerProviderConfig`](../type-aliases/IndexerProviderConfig.md)

### Returns

[`IndexerPublicDataProvider`](../classes/IndexerPublicDataProvider.md)

## Call Signature

> **indexerPublicDataProvider**(`queryURL`, `subscriptionURL`, `webSocket?`): [`IndexerPublicDataProvider`](../classes/IndexerPublicDataProvider.md)

### Parameters

#### queryURL

`string`

#### subscriptionURL

`string`

#### webSocket?

*typeof* `WebSocket`

### Returns

[`IndexerPublicDataProvider`](../classes/IndexerPublicDataProvider.md)

### Deprecated

Use the `IndexerProviderConfig` overload.
