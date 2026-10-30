[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / TxFailedError

# Class: TxFailedError

An error indicating that a transaction submitted to a consensus node failed.

The current era's subclass of [AnyEraTxFailedError](AnyEraTxFailedError.md): its record is always
the v9 one. Catch the base to catch both eras.

## Extends

- [`AnyEraTxFailedError`](AnyEraTxFailedError.md)

## Extended by

- [`CallTxFailedError`](CallTxFailedError.md)
- [`DeployTxFailedError`](DeployTxFailedError.md)
- [`InsertVerifierKeyTxFailedError`](InsertVerifierKeyTxFailedError.md)
- [`RemoveVerifierKeyTxFailedError`](RemoveVerifierKeyTxFailedError.md)
- [`ReplaceMaintenanceAuthorityTxFailedError`](ReplaceMaintenanceAuthorityTxFailedError.md)

## Constructors

### Constructor

> **new TxFailedError**(`finalizedTxData`, `circuitId?`): `TxFailedError`

#### Parameters

##### finalizedTxData

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md)

The finalization data of the transaction that failed.

##### circuitId?

`string` \| `string`[]

The name of the circuit that was called to create the call
                 transaction that failed. Only defined if a call transaction
                 failed.

#### Returns

`TxFailedError`

#### Overrides

[`AnyEraTxFailedError`](AnyEraTxFailedError.md).[`constructor`](AnyEraTxFailedError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Inherited from

[`AnyEraTxFailedError`](AnyEraTxFailedError.md).[`category`](AnyEraTxFailedError.md#category)

***

### circuitId?

> `readonly` `optional` **circuitId?**: `string` \| `string`[]

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_TX_FAILED"`

The one code every recorded-failure class in this package answers to.

Branch on this rather than `instanceof` where these classes cannot be
imported, or where there may be more than one copy of this package in the
process. Subclasses inherit it rather than each declaring their own.

#### See

[ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for why the code sits on the base.

#### Inherited from

[`AnyEraTxFailedError`](AnyEraTxFailedError.md).[`code`](AnyEraTxFailedError.md#code)

***

### finalizedTxData

> `readonly` **finalizedTxData**: [`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md)

## Accessors

### record

#### Get Signature

> **get** **record**(): [`FinalizedTxRead`](../../types/type-aliases/FinalizedTxRead.md)

See [AnyEraTxFailedError.record](AnyEraTxFailedError.md#record). Always the v9 variant on this class.

##### Returns

[`FinalizedTxRead`](../../types/type-aliases/FinalizedTxRead.md)

The finalized record the chain reported, tagged with its era.

#### Remarks

`record.tx` is a `FinalizedTx` in the era `record.era` names.
Read it with `LedgerTransaction.unwrap(record.tx, record.era)`, after
narrowing on `record.era`.

#### Overrides

[`AnyEraTxFailedError`](AnyEraTxFailedError.md).[`record`](AnyEraTxFailedError.md#record)
