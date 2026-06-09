[**Midnight.js API Reference v4.1.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / indexerPublicDataProvider

# Function: indexerPublicDataProvider()

## Call Signature

> **indexerPublicDataProvider**(`config`): [`PublicDataProvider`](#)

Constructs an indexer-backed [PublicDataProvider](#).

Two call forms:
1. Object-config (preferred): `indexerPublicDataProvider({ queryURL, subscriptionURL, webSocket?, pollInterval? })`.
2. Positional (deprecated, retained for backward compatibility): `indexerPublicDataProvider(queryURL, subscriptionURL, webSocket?)`.

The returned object exposes `dispose()` to release the WebSocket
connection and Apollo state. Always call it on long-running providers.

The current implementation wraps the inner class with
`assertIsContractAddress` calls on every method that accepts a
`ContractAddress`. The wrapper is removed in Phase 3 by moving the
assertions into the class methods themselves.

### Parameters

#### config

[`IndexerProviderConfig`](../type-aliases/IndexerProviderConfig.md)

### Returns

[`PublicDataProvider`](#)

## Call Signature

> **indexerPublicDataProvider**(`queryURL`, `subscriptionURL`, `webSocket?`): [`PublicDataProvider`](#)

### Parameters

#### queryURL

`string`

#### subscriptionURL

`string`

#### webSocket?

*typeof* `WebSocket`

### Returns

[`PublicDataProvider`](#)

### Deprecated

Use the `IndexerProviderConfig` overload.
