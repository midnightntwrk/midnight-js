[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / UnshieldedUtxo

# Type Alias: UnshieldedUtxo

> **UnshieldedUtxo** = `object`

Defined in: packages/types/dist/index.d.ts:129

Represents an unshielded UTXO (Unspent Transaction Output).
Unshielded UTXOs are outputs that have not been shielded or encrypted, making them visible on the public ledger.

## Properties

### intentHash

> `readonly` **intentHash**: [`IntentHash`](../../../midnight-js-protocol/ledger/type-aliases/IntentHash.md)

Defined in: packages/types/dist/index.d.ts:138

The identifier of the intent associated with the unshielded UTXO.
This is used to track the intent behind the creation or use of the UTXO.

***

### owner

> `readonly` **owner**: [`ContractAddress`](../../../midnight-js-protocol/ledger/type-aliases/ContractAddress.md)

Defined in: packages/types/dist/index.d.ts:133

The unique identifier of the unshielded UTXO.

***

### tokenType

> `readonly` **tokenType**: [`RawTokenType`](../../../midnight-js-protocol/ledger/type-aliases/RawTokenType.md)

Defined in: packages/types/dist/index.d.ts:143

The type of token associated with the unshielded UTXO.
This indicates the kind of asset or currency represented by the UTXO.

***

### value

> `readonly` **value**: `bigint`

Defined in: packages/types/dist/index.d.ts:147

The value of the unshielded UTXO, represented as a bigint.
