[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / RetainedEraBalancer

# Type Alias: RetainedEraBalancer

> **RetainedEraBalancer** = (`txBytes`, `ttl?`) => `Promise`\<`Uint8Array`\>

Balances a RETAINED-era transaction (an era in `RetainedLedgerVersion`; today
ledger 8), which is passed to `balanceTx` as serialized
bytes in both directions.

## Parameters

### txBytes

`Uint8Array`

### ttl?

`Date`

## Returns

`Promise`\<`Uint8Array`\>
