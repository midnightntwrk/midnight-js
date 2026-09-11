[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / RetainedEraSubmitter

# Type Alias: RetainedEraSubmitter

> **RetainedEraSubmitter** = (`txBytes`) => `Promise`\<[`TransactionId`](https://github.com/midnightntwrk/midnight-ledger)\>

Submits a RETAINED-era transaction, which crosses this seam as serialized
bytes.

Unlike the other two seams this arm answers untagged, because a transaction
identifier is era-independent — the eras differ only in what they are handed.

## Parameters

### txBytes

`Uint8Array`

## Returns

`Promise`\<[`TransactionId`](https://github.com/midnightntwrk/midnight-ledger)\>
