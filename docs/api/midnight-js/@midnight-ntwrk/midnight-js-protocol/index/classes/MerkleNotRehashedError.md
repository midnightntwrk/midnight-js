[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / MerkleNotRehashedError

# Class: MerkleNotRehashedError

Thrown by `checkRoot` (`lib/v8/down-convert.ts`) when a bounded Merkle
tree's root is read before the tree has been rehashed. Reaches a caller
through `assertMerkleTreesRehashed` and `downConvertForExecution`, which
assert it on every tree they decode.

The remediation is always the caller's: call `rehash()` on the tree before
executing against it. Nothing here repairs the tree.

## Param

**cause**

The runtime's own failure, when reading the root threw. Absent
  when `root()` returned nothing instead of throwing.

## See

 - [FailClosedDecoding](../../documents/FailClosedDecoding.md)
 - [RetainedEraExecution](../../documents/RetainedEraExecution.md)

## Extends

- `Error`

## Constructors

### Constructor

> **new MerkleNotRehashedError**(`cause?`): `MerkleNotRehashedError`

#### Parameters

##### cause?

`unknown`

#### Returns

`MerkleNotRehashedError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_MERKLE_NOT_REHASHED"` = `PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED`
