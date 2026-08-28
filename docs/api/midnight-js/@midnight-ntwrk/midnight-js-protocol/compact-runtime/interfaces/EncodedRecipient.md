[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / EncodedRecipient

# Interface: EncodedRecipient

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:77

A [Recipient](Recipient.md) with its fields encoded as byte strings. This representation is used internally by the contract executable.

## Properties

### is\_left

> `readonly` **is\_left**: `boolean`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:81

Whether the recipient is a user or a contract.

***

### left

> `readonly` **left**: [`EncodedCoinPublicKey`](EncodedCoinPublicKey.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:85

The recipient's public key, if the recipient is a user.

***

### right

> `readonly` **right**: [`EncodedContractAddress`](EncodedContractAddress.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:89

The recipient's contract address, if the recipient is a contract.
