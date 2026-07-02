[**Midnight.js API Reference v5.0.0-alpha.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / IndexerProviderConfig

# Type Alias: IndexerProviderConfig

> **IndexerProviderConfig** = `object`

User-facing configuration for the indexer public data provider.
All fields except the URLs are optional; defaults are filled in by
validateConfig.

## Properties

### pollInterval?

> `readonly` `optional` **pollInterval?**: `number`

Defaults to [DEFAULT\_POLL\_INTERVAL](../variables/DEFAULT_POLL_INTERVAL.md). Must be a positive integer.

***

### queryURL

> `readonly` **queryURL**: `string`

***

### subscriptionURL

> `readonly` **subscriptionURL**: `string`

***

### webSocket?

> `readonly` `optional` **webSocket?**: *typeof* `WebSocket`
