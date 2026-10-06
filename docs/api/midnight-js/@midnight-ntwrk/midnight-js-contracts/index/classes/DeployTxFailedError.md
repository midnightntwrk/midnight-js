[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / DeployTxFailedError

# Class: DeployTxFailedError

An error indicating that a deploy transaction was not successfully applied by the consensus node.

## Extends

- [`TxFailedError`](TxFailedError.md)

## Constructors

### Constructor

> **new DeployTxFailedError**(`finalizedTxData`): `DeployTxFailedError`

#### Parameters

##### finalizedTxData

[`FinalizedTxData`](../../../midnight-js/types/interfaces/FinalizedTxData.md)

The finalization data of the deployment transaction that failed.

#### Returns

`DeployTxFailedError`

#### Overrides

[`TxFailedError`](TxFailedError.md).[`constructor`](TxFailedError.md#constructor)

## Properties

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

> `readonly` **finalizedTxData**: [`FinalizedTxData`](../../../midnight-js/types/interfaces/FinalizedTxData.md)

The finalization data of the transaction that failed.

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`finalizedTxData`](TxFailedError.md#finalizedtxdata)

## Accessors

### record

#### Get Signature

> **get** **record**(): [`VersionedFinalizedTxData`](../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)

See [AnyEraTxFailedError.record](AnyEraTxFailedError.md#record). Always the v9 arm on this class.

##### Returns

[`VersionedFinalizedTxData`](../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)

The finalized record the chain reported, version-tagged.

#### Remarks

Narrow on `record.version` before reading `record.tx`: the handle
belongs to the ledger runtime the tag names.

#### Inherited from

[`TxFailedError`](TxFailedError.md).[`record`](TxFailedError.md#record)
