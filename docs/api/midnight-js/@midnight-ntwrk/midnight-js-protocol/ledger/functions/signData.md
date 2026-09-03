[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / signData

# Function: signData()

> **signData**(`key`, `data`): [`Signature`](../type-aliases/Signature.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:447

Signs arbitrary data with the given signing key.

WARNING: Do not expose access to this function for valuable keys for data
that is not strictly controlled!

## Parameters

### key

[`SigningKey`](../type-aliases/SigningKey.md)

### data

`Uint8Array`

## Returns

[`Signature`](../type-aliases/Signature.md)
