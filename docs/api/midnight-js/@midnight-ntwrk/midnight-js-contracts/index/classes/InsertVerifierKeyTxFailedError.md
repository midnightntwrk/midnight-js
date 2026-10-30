[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / InsertVerifierKeyTxFailedError

# Class: InsertVerifierKeyTxFailedError

An error indicating that a verifier key insertion transaction failed.

## Extends

- [`TxFailedError`](TxFailedError.md)

## Constructors

### Constructor

> **new InsertVerifierKeyTxFailedError**(`finalizedTxData`): `InsertVerifierKeyTxFailedError`

#### Parameters

##### finalizedTxData

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md)

#### Returns

`InsertVerifierKeyTxFailedError`

#### Overrides

[`TxFailedError`](TxFailedError.md).[`constructor`](TxFailedError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`category`](TxFailedError.md#category)

***

### circuitId?

> `readonly` `optional` **circuitId?**: `string` \| `string`[]

The name of the circuit that was called to create the call
                 transaction that failed. Only defined if a call transaction
                 failed.

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`circuitId`](TxFailedError.md#circuitid)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_TX_FAILED"` = `CONTRACTS_ERROR_CODES.TX_FAILED`

The one code every recorded-failure class in this package answers to.

Branch on this rather than `instanceof` where these classes cannot be
imported, or where there may be more than one copy of this package in the
process. Subclasses inherit it rather than each declaring their own.

#### See

[ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for why the code sits on the base.

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`code`](TxFailedError.md#code)

***

### finalizedTxData

> `readonly` **finalizedTxData**: [`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md)

The finalization data of the transaction that failed.

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`finalizedTxData`](TxFailedError.md#finalizedtxdata)

## Accessors

### record

#### Get Signature

> **get** **record**(): [`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

See [AnyEraTxFailedError.record](AnyEraTxFailedError.md#record). Always the v9 variant on this class.

##### Returns

[`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

The finalized record the chain reported, tagged with its era.

#### Remarks

`record.tx` is a `FinalizedTx` in the era `record.era` names.
Read it with `LedgerTransaction.unwrap(record.tx, record.era)`, after
narrowing on `record.era`.

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`record`](TxFailedError.md#record)
