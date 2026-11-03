[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CallTxFailedError

# Class: CallTxFailedError

An error indicating that a retained-era call was recorded on chain with a
status other than `SucceedEntirely`.

The retained-era counterpart of [CallTxFailedError](../../../classes/CallTxFailedError.md), which cannot be
reused because it carries a `Ledger9FinalizedTxData` where a retained
call is recorded as an era-tagged [FinalizedTxRead](../../../../../midnight-js/types/type-aliases/FinalizedTxRead.md).

Carries no registered error code of its own. Branch on the class, or on the
inherited [AnyEraTxFailedError.code](../../../classes/AnyEraTxFailedError.md#code), and read the record off
[txData](#txdata) rather than out of the message.

## See

[ErrorTaxonomy](../../../../documents/ErrorTaxonomy.md) for why this retained-era class registers no code, and for the
local-versus-chain consequence the message states per status.

## Extends

- [`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md)

## Constructors

### Constructor

> **new CallTxFailedError**(`txData`, `circuitId`): `Ledger8CallTxFailedError`

#### Parameters

##### txData

[`FinalizedTxRead`](../../../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

##### circuitId

`string`

#### Returns

`Ledger8CallTxFailedError`

#### Overrides

[`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md).[`constructor`](../../../classes/AnyEraTxFailedError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Inherited from

[`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md).[`category`](../../../classes/AnyEraTxFailedError.md#category)

***

### circuitId

> `readonly` **circuitId**: `string`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_TX_FAILED"` = `CONTRACTS_ERROR_CODES.TX_FAILED`

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

> `readonly` **txData**: [`FinalizedTxRead`](../../../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

## Accessors

### record

#### Get Signature

> **get** **record**(): [`FinalizedTxRead`](../../../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

See [AnyEraTxFailedError.record](../../../classes/AnyEraTxFailedError.md#record). Either variant on this class.

##### Returns

[`FinalizedTxRead`](../../../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

The finalized record the chain reported, tagged with its era.

#### Remarks

`record.tx` is a `FinalizedTx` in the era `record.era` names.
Read it with `LedgerTransaction.unwrap(record.tx, record.era)`, after
narrowing on `record.era`.

#### Overrides

[`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md).[`record`](../../../classes/AnyEraTxFailedError.md#record)
