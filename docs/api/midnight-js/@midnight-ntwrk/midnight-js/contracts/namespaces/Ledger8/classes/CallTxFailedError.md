[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / CallTxFailedError

# Class: CallTxFailedError

An error indicating that a retained-era call was recorded on chain with a
status other than `SucceedEntirely`.

The retained-era counterpart of [CallTxFailedError](../../../classes/CallTxFailedError.md), which cannot be
reused because it carries a current-era `FinalizedTxData` where a retained
call is recorded as a version-tagged [VersionedFinalizedTxData](../../../../types/type-aliases/VersionedFinalizedTxData.md).

Carries no registered error code, for the same reason
[Ledger8DeployUnmaintainableError](DeployUnmaintainableError.md) does not: the code would be a
published commitment on an arm whose record type is expected to converge with
the current era's. The record itself is on [txData](#txdata) so a caller can
branch on the status rather than read it out of the message.

The message states the local-versus-chain consequence per STATUS, because the
two differ: with the whole transaction rejected nothing landed, but a
fallible-phase failure keeps every guaranteed effect — and this pipeline
places every movement it makes in the guaranteed segment, so the chain moved
while the private state was not stored.

## Extends

- [`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md)

## Constructors

### Constructor

> **new CallTxFailedError**(`txData`, `circuitId`): `Ledger8CallTxFailedError`

#### Parameters

##### txData

[`VersionedFinalizedTxData`](../../../../types/type-aliases/VersionedFinalizedTxData.md)

##### circuitId

`string`

#### Returns

`Ledger8CallTxFailedError`

#### Overrides

[`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md).[`constructor`](../../../classes/AnyEraTxFailedError.md#constructor)

## Properties

### circuitId

> `readonly` **circuitId**: `string`

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

[`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md).[`code`](../../../classes/AnyEraTxFailedError.md#code)

***

### txData

> `readonly` **txData**: [`VersionedFinalizedTxData`](../../../../types/type-aliases/VersionedFinalizedTxData.md)

## Accessors

### record

#### Get Signature

> **get** **record**(): [`VersionedFinalizedTxData`](../../../../types/type-aliases/VersionedFinalizedTxData.md)

See [AnyEraTxFailedError.record](../../../classes/AnyEraTxFailedError.md#record). Either arm on this class.

##### Returns

[`VersionedFinalizedTxData`](../../../../types/type-aliases/VersionedFinalizedTxData.md)

The finalized record the chain reported, version-tagged.

#### Remarks

Narrow on `record.version` before reading `record.tx`: the handle
belongs to the ledger runtime the tag names.

#### Overrides

[`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md).[`record`](../../../classes/AnyEraTxFailedError.md#record)
