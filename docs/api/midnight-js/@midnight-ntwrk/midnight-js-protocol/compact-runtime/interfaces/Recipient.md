[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / Recipient

# Interface: Recipient

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:6

The recipient of a coin produced by a circuit.

## Properties

### is\_left

> `readonly` **is\_left**: `boolean`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:10

Whether the recipient is a user or a contract.

***

### left

> `readonly` **left**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:14

The recipient's public key, if the recipient is a user.

***

### right

> `readonly` **right**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:18

The recipient's contract address, if the recipient is a contract.
