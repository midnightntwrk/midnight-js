[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / Recipient

# Interface: Recipient

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:65

The recipient of a coin produced by a circuit.

## Properties

### is\_left

> `readonly` **is\_left**: `boolean`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:69

Whether the recipient is a user or a contract.

***

### left

> `readonly` **left**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:73

The recipient's public key, if the recipient is a user.

***

### right

> `readonly` **right**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:77

The recipient's contract address, if the recipient is a contract.
