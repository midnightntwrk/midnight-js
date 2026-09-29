[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / CallTxFailedError

# Class: CallTxFailedError

An error indicating that a retained-era call was recorded on chain with a
status other than `SucceedEntirely`.

The retained-era counterpart of [CallTxFailedError](../../../classes/CallTxFailedError.md), which cannot be
reused because it carries a current-era `FinalizedTxData` where a retained
call is recorded as a version-tagged [VersionedFinalizedTxData](../../../../types/type-aliases/VersionedFinalizedTxData.md).

Carries no registered error code of its own. Branch on the class, or on the
inherited [AnyEraTxFailedError.code](../../../classes/AnyEraTxFailedError.md#code), and read the record off
[txData](#txdata) rather than out of the message.

## See

[ErrorTaxonomy](../../../../documents/ErrorTaxonomy.md) for why this arm registers no code, and for the
local-versus-chain consequence the message states per status.

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

Branch on this rather than `instanceof` where these classes cannot be
imported, or where there may be more than one copy of this package in the
process. Subclasses inherit it rather than each declaring their own.

#### See

[ErrorTaxonomy](../../../../documents/ErrorTaxonomy.md) for why the code sits on the base.

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
