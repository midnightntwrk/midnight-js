[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / UtxoSpend

# Type Alias: UtxoSpend

> **UtxoSpend** = `object`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1905

An input appearing in an [Intent](../classes/Intent.md), or a user's local book-keeping.

## Properties

### intentHash

> **intentHash**: [`IntentHash`](IntentHash.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1921

The hash of the intent outputting this UTXO

***

### outputNo

> **outputNo**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1925

The output number of this UTXO in its parent [Intent](../classes/Intent.md).

***

### owner

> **owner**: [`SignatureVerifyingKey`](SignatureVerifyingKey.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1913

The signing key owning these tokens.

***

### type

> **type**: [`RawTokenType`](RawTokenType.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1917

The token type of this UTXO

***

### value

> **value**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1909

The amount of tokens this UTXO represents
