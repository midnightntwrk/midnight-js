[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / ReplaceMaintenanceAuthorityTxFailedError

# Class: ReplaceMaintenanceAuthorityTxFailedError

A retained-era maintenance authority replacement that the chain recorded as failed.

[Ledger8ReplaceMaintenanceAuthorityTxFailedError.signingKey](#signingkey) is NAMED but never rendered
into the message: the store still holds the old key, and if the replacement landed this is the
only copy of the one that authorizes the contract.

## Extends

- `Ledger8MaintenanceTxFailedError`

## Constructors

### Constructor

> **new ReplaceMaintenanceAuthorityTxFailedError**(`txData`, `contractAddress`, `signingKey`): `Ledger8ReplaceMaintenanceAuthorityTxFailedError`

#### Parameters

##### txData

[`Ledger8FinalizedTxData`](../../../../../midnight-js/types/interfaces/Ledger8FinalizedTxData.md)

##### contractAddress

`string`

##### signingKey

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

#### Returns

`Ledger8ReplaceMaintenanceAuthorityTxFailedError`

#### Overrides

`Ledger8MaintenanceTxFailedError.constructor`

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Inherited from

`Ledger8MaintenanceTxFailedError.category`

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

`Ledger8MaintenanceTxFailedError.code`

***

### contractAddress

> `readonly` **contractAddress**: `string`

#### Inherited from

`Ledger8MaintenanceTxFailedError.contractAddress`

***

### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

***

### txData

> `readonly` **txData**: [`Ledger8FinalizedTxData`](../../../../../midnight-js/types/interfaces/Ledger8FinalizedTxData.md)

#### Inherited from

`Ledger8MaintenanceTxFailedError.txData`

## Accessors

### record

#### Get Signature

> **get** **record**(): [`Ledger8FinalizedTxData`](../../../../../midnight-js/types/interfaces/Ledger8FinalizedTxData.md)

See [AnyEraTxFailedError.record](../../../classes/AnyEraTxFailedError.md#record). Always the ledger 8 variant on this class.

##### Returns

[`Ledger8FinalizedTxData`](../../../../../midnight-js/types/interfaces/Ledger8FinalizedTxData.md)

#### Inherited from

`Ledger8MaintenanceTxFailedError.record`
