[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / sampleSigningKey

# Function: sampleSigningKey()

> **sampleSigningKey**(`kind?`): [`SigningKey`](../type-aliases/SigningKey.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:434

Randomly samples a [SigningKey](../type-aliases/SigningKey.md). If `kind` is not supplied, assumes
`schnorr`.

## Parameters

### kind?

[`SignatureKind`](../type-aliases/SignatureKind.md)

## Returns

[`SigningKey`](../type-aliases/SigningKey.md)
