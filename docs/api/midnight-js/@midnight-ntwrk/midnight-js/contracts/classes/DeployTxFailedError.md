[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / DeployTxFailedError

# Class: DeployTxFailedError

An error indicating that a deploy transaction was not successfully applied by the consensus node.

## Extends

- [`TxFailedError`](TxFailedError.md)

## Constructors

### Constructor

> **new DeployTxFailedError**(`finalizedTxData`): `DeployTxFailedError`

#### Parameters

##### finalizedTxData

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)

The finalization data of the deployment transaction that failed.

#### Returns

`DeployTxFailedError`

#### Overrides

[`TxFailedError`](TxFailedError.md).[`constructor`](TxFailedError.md#constructor)

## Properties

### circuitId?

> `readonly` `optional` **circuitId?**: `string` \| `string`[]

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`circuitId`](TxFailedError.md#circuitid)

***

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

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`code`](TxFailedError.md#code)

***

### finalizedTxData

> `readonly` **finalizedTxData**: [`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`finalizedTxData`](TxFailedError.md#finalizedtxdata)

## Accessors

### record

#### Get Signature

> **get** **record**(): [`VersionedFinalizedTxData`](../../types/type-aliases/VersionedFinalizedTxData.md)

See [AnyEraTxFailedError.record](AnyEraTxFailedError.md#record). Always the v9 arm on this class.

##### Returns

[`VersionedFinalizedTxData`](../../types/type-aliases/VersionedFinalizedTxData.md)

The finalized record the chain reported, version-tagged.

#### Remarks

Narrow on `record.version` before reading `record.tx`: the handle
belongs to the ledger runtime the tag names.

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`record`](TxFailedError.md#record)
