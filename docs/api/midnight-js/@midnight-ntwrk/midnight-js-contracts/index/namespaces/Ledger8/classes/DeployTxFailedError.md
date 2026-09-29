[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / DeployTxFailedError

# Class: DeployTxFailedError

An error indicating that a retained-era DEPLOY was recorded on chain with a
status other than `SucceedEntirely`.

DO NOT DEPLOY AGAIN on seeing this. A `ContractDeploy` sits in the Intent —
the GUARANTEED part — so on `FailFallible` the contract DID land, under the
maintenance authority built from
[Ledger8DeployTxFailedError.signingKey](#signingkey). Check the address first.

[Ledger8DeployTxFailedError.signingKey](#signingkey) is NAMED but never rendered
into the message: it is the only copy of the authority over a deployment that
may have landed.

Carries no registered error code of its own.

## See

[ErrorTaxonomy](../../../../documents/ErrorTaxonomy.md) for why a failed deploy is a separate class from a
failed call, why no code is registered, and why the key is never rendered.

## Extends

- [`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md)

## Constructors

### Constructor

> **new DeployTxFailedError**(`txData`, `contractAddress`, `signingKey`): `Ledger8DeployTxFailedError`

#### Parameters

##### txData

[`VersionedFinalizedTxData`](../../../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)

The record the read surface reported.

##### contractAddress

`string`

The address this deployment composed.

##### signingKey

`string`

The key the deployment's maintenance authority was built
from — sampled when the caller named none, and then this is its only copy.

#### Returns

`Ledger8DeployTxFailedError`

#### Overrides

[`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md).[`constructor`](../../../classes/AnyEraTxFailedError.md#constructor)

## Properties

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

### contractAddress

> `readonly` **contractAddress**: `string`

The address this deployment composed.

***

### signingKey

> `readonly` **signingKey**: `string`

The key the deployment's maintenance authority was built
from — sampled when the caller named none, and then this is its only copy.

***

### txData

> `readonly` **txData**: [`VersionedFinalizedTxData`](../../../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)

The record the read surface reported.

## Accessors

### record

#### Get Signature

> **get** **record**(): [`VersionedFinalizedTxData`](../../../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)

See [AnyEraTxFailedError.record](../../../classes/AnyEraTxFailedError.md#record). Either arm on this class.

##### Returns

[`VersionedFinalizedTxData`](../../../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)

The finalized record the chain reported, version-tagged.

#### Remarks

Narrow on `record.version` before reading `record.tx`: the handle
belongs to the ledger runtime the tag names.

#### Overrides

[`AnyEraTxFailedError`](../../../classes/AnyEraTxFailedError.md).[`record`](../../../classes/AnyEraTxFailedError.md#record)
