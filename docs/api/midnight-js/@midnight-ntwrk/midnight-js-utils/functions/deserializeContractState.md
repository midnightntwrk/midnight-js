[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / deserializeContractState

# Function: deserializeContractState()

> **deserializeContractState**(`bytes`, `ctx`): `ContractState`

Deserialize a ledger LedgerContractState from raw bytes.

## Parameters

### bytes

`Uint8Array`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

`ContractState`

## Throws

On any underlying ledger deserialization
  failure. The error carries classification, direction inference, and
  actionable mitigation hints.

## Example

```ts
const state = deserializeContractState(buf, {
  caller: '@midnight-ntwrk/midnight-js-indexer-public-data-provider:queryContractState'
});
```

The `caller` should be fully qualified (`@scope/package:function`) — this
convention is enforced across the codebase and surfaces in the rendered
error message.
