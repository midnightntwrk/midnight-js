[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / TxFailedError

# Class: TxFailedError

An error indicating that a transaction submitted to a consensus node failed.

The current era's arm of [AnyEraTxFailedError](AnyEraTxFailedError.md): its record is always
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

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)

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

> `readonly` **finalizedTxData**: [`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)

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

#### Overrides

[`AnyEraTxFailedError`](AnyEraTxFailedError.md).[`record`](AnyEraTxFailedError.md#record)
