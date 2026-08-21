[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / createProvingTransactionPayload

# ~~Function: createProvingTransactionPayload()~~

> **createProvingTransactionPayload**(`transaction`, `proving_data`): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1690

Creates a payload for proving a specific transaction through the proof server

## Parameters

### transaction

[`UnprovenTransaction`](../type-aliases/UnprovenTransaction.md)

### proving\_data

`Map`\<`string`, [`ProvingKeyMaterial`](../type-aliases/ProvingKeyMaterial.md)\>

## Returns

`Uint8Array`

## Deprecated

Use `Transaction.prove` instead.
