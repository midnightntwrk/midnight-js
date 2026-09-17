[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / DeployTxFailedError

# Class: DeployTxFailedError

An error indicating that a retained-era DEPLOY was recorded on chain with a
status other than `SucceedEntirely`.

Separate from [Ledger8CallTxFailedError](CallTxFailedError.md) because the remediation is,
and for the same reason [StaleHeadError](../../../classes/StaleHeadError.md) writes a deploy's remediation
separately: a failed call can simply be run again, while a failed deploy
cannot be retried blindly. A deploy mints a fresh nonce, so a second attempt
lands at a DIFFERENT address, and repeating one that in fact finalized leaves
two copies of the contract on chain.

Carries no registered error code, for the same reason its call-arm sibling
does not.

The message states the local-versus-chain consequence per STATUS, because the
two differ, and the difference is the whole remediation. A `ContractDeploy`
sits in the Intent — the GUARANTEED part — so on `FailFallible` the contract
DID land, under the maintenance authority built from
[Ledger8DeployTxFailedError.signingKey](#signingkey). A single message saying nothing
local refers to the address let that caller conclude nothing happened, and
never go looking for a deployment it owns and cannot maintain.

[Ledger8DeployTxFailedError.signingKey](#signingkey) is NAMED but never rendered: it
is a secret, and an error message reaches logs and issue trackers, while this
is the only copy of the authority over a deployment that landed.

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
