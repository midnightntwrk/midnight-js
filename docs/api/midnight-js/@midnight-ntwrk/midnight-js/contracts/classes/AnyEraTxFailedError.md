[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / AnyEraTxFailedError

# Abstract Class: AnyEraTxFailedError

A transaction this framework submitted that the chain recorded with a
non-success status, in EITHER era. The one class to catch.

The two eras cannot share a record TYPE. The current era submits and accepts
only v9, so its record is `FinalizedTxData`. A retained-era call is recorded
by whichever era the network head is on, so its record is the version-tagged
union -- which is not assignable to the v9 arm, and narrowing the current
era's member to the union would change a type consumers already read. That
is why the retained era has a class of its own rather than extending
`TxFailedError`, and why this base declares the union.

Each subclass keeps its own historical member -- `finalizedTxData` on the
current era's, `txData` on the retained one -- so nothing reading those
breaks. [AnyEraTxFailedError.record](#record) is the member to write new code
against, and it needs narrowing on `version` before `tx` is touched.

## Extends

- `Error`

## Extended by

- [`TxFailedError`](TxFailedError.md)
- [`CallTxFailedError`](../namespaces/Ledger8/classes/CallTxFailedError.md)

## Constructors

### Constructor

> **new AnyEraTxFailedError**(`message?`): `AnyEraTxFailedError`

#### Parameters

##### message?

`string`

#### Returns

`AnyEraTxFailedError`

#### Inherited from

`Error.constructor`

### Constructor

> **new AnyEraTxFailedError**(`message?`, `options?`): `AnyEraTxFailedError`

#### Parameters

##### message?

`string`

##### options?

`ErrorOptions`

#### Returns

`AnyEraTxFailedError`

#### Inherited from

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_TX_FAILED"`

The one code every recorded-failure class in this package answers to.

`instanceof` is the idiom this hierarchy is built for, but it is identity-
based: with two copies of this package resolved in one process it returns
`false` and a failed transaction walks past a correctly written handler.
A consumer that cannot import these classes, or cannot rely on there being
one copy of them, branches on this instead. Subclasses inherit it rather
than each declaring their own -- what a caller needs to distinguish is
WHICH transaction failed, which the class and the record answer, not a
finer code.

***

### record

> `abstract` `readonly` **record**: [`VersionedFinalizedTxData`](../../types/type-aliases/VersionedFinalizedTxData.md)

The finalized record the chain reported, version-tagged.

#### Remarks

Narrow on `record.version` before reading `record.tx`: the handle
belongs to the ledger runtime the tag names.
