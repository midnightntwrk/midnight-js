[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / parseHexZswapState

# Function: parseHexZswapState()

> **parseHexZswapState**(`s`): [`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)

Adapters that take hex-encoded indexer payloads, decode to bytes, and
dispatch to the typed deserialization wrappers from `@midnight-ntwrk/midnight-js-utils`.
They exist (rather than inlining) so the `caller` string is centralized and
regression-testable. Re-exported from the package entry point, so their
signatures are public API.

## Parameters

### s

`string`

## Returns

[`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)
