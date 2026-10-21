[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / RetainedEraProver

# Type Alias: RetainedEraProver

> **RetainedEraProver** = (`txBytes`, `config?`) => `Promise`\<`Uint8Array`\>

Proves a RETAINED-era transaction (an era in `RetainedLedgerVersion`; today
ledger 8), which is passed to `proveTx` as serialized
bytes in both directions: the runtime that owns such a transaction is loaded
lazily and its instances are not interchangeable with the current era's.

## Parameters

### txBytes

`Uint8Array`

### config?

[`ProveTxConfig`](../interfaces/ProveTxConfig.md)

## Returns

`Promise`\<`Uint8Array`\>
