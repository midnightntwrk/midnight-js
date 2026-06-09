[**Midnight.js API Reference v4.1.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / indexerPublicDataProvider

# Function: indexerPublicDataProvider()

> **indexerPublicDataProvider**(`queryURL`, `subscriptionURL`, `webSocketImpl?`): [`PublicDataProvider`](#)

Constructs a [PublicDataProvider](#) based on an Apollo Client.

Wraps the internal factory to assert that input contract addresses are
valid before forwarding the call. The duplicated `assertIsContractAddress`
calls below are removed in Phase 3 by moving the assertion into the class
methods themselves.

## Parameters

### queryURL

`string`

The URL of a GraphQL server query endpoint.

### subscriptionURL

`string`

The URL of a GraphQL server subscription (websocket) endpoint.

### webSocketImpl?

*typeof* `WebSocket` = `ws.WebSocket`

An optional websocket implementation for the Apollo client to use.

## Returns

[`PublicDataProvider`](#)
