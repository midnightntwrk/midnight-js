[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / RetainedEraSubmitter

# Type Alias: RetainedEraSubmitter

> **RetainedEraSubmitter** = (`txBytes`) => `Promise`\<[`TransactionId`](https://github.com/midnightntwrk/midnight-ledger)\>

Submits a RETAINED-era transaction (an era in `RetainedLedgerVersion`; today
ledger 8), which is passed to `submitTx` as serialized
bytes.

Unlike the other two transaction methods this one answers untagged, because a transaction
identifier is era-independent — the eras differ only in what they are handed.

## Parameters

### txBytes

`Uint8Array`

## Returns

`Promise`\<[`TransactionId`](https://github.com/midnightntwrk/midnight-ledger)\>
