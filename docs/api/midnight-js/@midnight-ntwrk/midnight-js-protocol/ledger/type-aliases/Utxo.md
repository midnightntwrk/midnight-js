[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / Utxo

# Type Alias: Utxo

> **Utxo** = `object`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1856

An unspent transaction output

## Properties

### intentHash

> **intentHash**: [`IntentHash`](IntentHash.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1872

The hash of the intent outputting this UTXO

***

### outputNo

> **outputNo**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1876

The output number of this UTXO in its parent [Intent](../classes/Intent.md).

***

### owner

> **owner**: [`UserAddress`](UserAddress.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1864

The address owning these tokens.

***

### type

> **type**: [`RawTokenType`](RawTokenType.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1868

The token type of this UTXO

***

### value

> **value**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1860

The amount of tokens this UTXO represents
