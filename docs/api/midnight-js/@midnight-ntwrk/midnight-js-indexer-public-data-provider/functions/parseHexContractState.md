[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / parseHexContractState

# Function: parseHexContractState()

> **parseHexContractState**(`s`): `ContractState`

Adapters that take hex-encoded indexer payloads, decode to bytes, and
dispatch to the typed deserialization wrappers from `@midnight-ntwrk/midnight-js-utils`.
They exist (rather than inlining) so the `caller` string is centralized and
regression-testable. Exported for tests; not part of the public package API.

## Parameters

### s

`string`

## Returns

`ContractState`
