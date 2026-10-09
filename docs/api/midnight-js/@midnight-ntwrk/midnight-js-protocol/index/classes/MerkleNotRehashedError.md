[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / MerkleNotRehashedError

# Class: MerkleNotRehashedError

Raised when a bounded Merkle tree's root is read before the tree has been
rehashed.

NOTHING RAISES THIS ANY MORE: the walk it served
(`assertMerkleTreesRehashed`, `lib/v8/down-convert.ts`) was removed with the
hand-maintained execution layer, and the condition it named cannot reach the
seam that replaced it. Execution now takes an already-encoded
`EncodedStateValue`, and a tree's rehash state does not survive that
encoding: a never-rehashed tree and a rehashed one encode IDENTICALLY, and
decoding either yields the same root. Being un-rehashed is a property of a
live in-memory handle only, so there is nothing left for a guard on this
side to refuse. Measured against the pinned runtime, not inferred.

Kept on the published surface, with its code, rather than removed from a
consumer's error taxonomy as a side effect of an internal refactor.

The remediation was always the caller's: call `rehash()` on the tree before
executing against it. Nothing here repairs the tree.

## Param

**cause**

The runtime's own failure, when reading the root threw. Absent
  when `root()` returned nothing instead of throwing.

## See

 - [FailClosedDecoding](../../documents/FailClosedDecoding.md)
 - [RetainedEraExecution](../../documents/RetainedEraExecution.md)

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new MerkleNotRehashedError**(`cause?`): `MerkleNotRehashedError`

#### Parameters

##### cause?

`unknown`

#### Returns

`MerkleNotRehashedError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_MERKLE_NOT_REHASHED"` = `PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)
