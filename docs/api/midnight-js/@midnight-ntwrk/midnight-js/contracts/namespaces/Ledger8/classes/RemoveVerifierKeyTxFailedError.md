[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / RemoveVerifierKeyTxFailedError

# Class: RemoveVerifierKeyTxFailedError

A retained-era verifier key removal that the chain recorded as failed.

## Extends

- `Ledger8MaintenanceTxFailedError`

## Constructors

### Constructor

> **new RemoveVerifierKeyTxFailedError**(`txData`, `contractAddress`, `circuitId`): `Ledger8RemoveVerifierKeyTxFailedError`

#### Parameters

##### txData

[`Ledger8FinalizedTxData`](../../../../types/interfaces/Ledger8FinalizedTxData.md)

##### contractAddress

`string`

##### circuitId

`string`

#### Returns

`Ledger8RemoveVerifierKeyTxFailedError`

#### Overrides

`Ledger8MaintenanceTxFailedError.constructor`

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../type-aliases/MidnightJsErrorCategory.md)

#### Inherited from

`Ledger8MaintenanceTxFailedError.category`

***

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

`Ledger8MaintenanceTxFailedError.code`

***

### contractAddress

> `readonly` **contractAddress**: `string`

#### Inherited from

`Ledger8MaintenanceTxFailedError.contractAddress`

***

### txData

> `readonly` **txData**: [`Ledger8FinalizedTxData`](../../../../types/interfaces/Ledger8FinalizedTxData.md)

#### Inherited from

`Ledger8MaintenanceTxFailedError.txData`

## Accessors

### record

#### Get Signature

> **get** **record**(): [`Ledger8FinalizedTxData`](../../../../types/interfaces/Ledger8FinalizedTxData.md)

See [AnyEraTxFailedError.record](../../../classes/AnyEraTxFailedError.md#record). Always the ledger 8 variant on this class.

##### Returns

[`Ledger8FinalizedTxData`](../../../../types/interfaces/Ledger8FinalizedTxData.md)

#### Inherited from

`Ledger8MaintenanceTxFailedError.record`
