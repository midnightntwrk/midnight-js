[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / AnyEraTxFailedError

# Abstract Class: AnyEraTxFailedError

A transaction this framework submitted that the chain recorded with a
non-success status, in EITHER era. The one class to catch.

Each subclass keeps its own historical member -- `finalizedTxData` on the
current era's, `txData` on the retained one -- so nothing reading those
breaks. [AnyEraTxFailedError.record](#record) is the member to write new code
against, and it needs narrowing on `version` before `tx` is touched.

## See

[ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for why the two eras cannot share a record type.

## Extends

- `Error`

## Extended by

- [`TxFailedError`](TxFailedError.md)
- [`CallTxFailedError`](../namespaces/Ledger8/classes/CallTxFailedError.md)
- [`DeployTxFailedError`](../namespaces/Ledger8/classes/DeployTxFailedError.md)

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

Branch on this rather than `instanceof` where these classes cannot be
imported, or where there may be more than one copy of this package in the
process. Subclasses inherit it rather than each declaring their own.

#### See

[ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for why the code sits on the base.

***

### record

> `abstract` `readonly` **record**: [`VersionedFinalizedTxData`](../../types/type-aliases/VersionedFinalizedTxData.md)

The finalized record the chain reported, version-tagged.

#### Remarks

Narrow on `record.version` before reading `record.tx`: the handle
belongs to the ledger runtime the tag names.
