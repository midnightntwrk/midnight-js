[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / proofDataIntoSerializedPreimage

# Function: proofDataIntoSerializedPreimage()

> **proofDataIntoSerializedPreimage**(`input`, `output`, `public_transcript`, `private_transcript_outputs`, `key_location?`): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:610

Converts input, output, and transcript information into a proof preimage
suitable to pass to a `ProvingProvider`.

The `key_location` parameter is a string used to identify the circuit by
proving machinery, for backwards-compatibility, if unset it defaults to
`'dummy'`.

## Parameters

### input

[`AlignedValue`](../type-aliases/AlignedValue.md)

### output

[`AlignedValue`](../type-aliases/AlignedValue.md)

### public\_transcript

[`Op`](../type-aliases/Op.md)\<[`AlignedValue`](../type-aliases/AlignedValue.md)\>[]

### private\_transcript\_outputs

[`AlignedValue`](../type-aliases/AlignedValue.md)[]

### key\_location?

`string`

## Returns

`Uint8Array`
