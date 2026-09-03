[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [SigningKey](../README.md) / SigningKey

# Interface: SigningKey

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/SigningKey.d.ts:39

A signing key, comprising the [kind](../type-aliases/SignatureKind.md) of signature scheme it is used with, along with the
raw key [value](../namespaces/SigningKey/type-aliases/Value.md).

## Remarks

A signing key is used to create a Contract Maintenance Authority (CMA) when initializing a new contract.
It is used to create a verifying key that is included in the contract deployment data that will
eventually be stored on the Midnight network.

The shape `{ tag, value }` is structurally compatible with the signing key representation used by the Midnight
ledger (Ledger 9).

## Properties

### tag

> `readonly` **tag**: `"schnorr"` \| `"ecdsa"`

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/SigningKey.d.ts:43

The kind of signature scheme this key is used with.

***

### value

> `readonly` **value**: [`Value`](../namespaces/SigningKey/type-aliases/Value.md)

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/SigningKey.d.ts:47

The raw key value, a public BIP-340 signing key, 32 bytes in length, with an optional 3-byte version prefix.
