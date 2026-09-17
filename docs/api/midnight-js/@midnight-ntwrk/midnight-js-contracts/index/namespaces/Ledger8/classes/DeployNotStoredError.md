[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / DeployNotStoredError

# Class: DeployNotStoredError

An error indicating that a retained-era deployment was CONFIRMED on chain,
but the private-state provider refused to record it locally.

Distinct from [Ledger8DeployUnconfirmedError](DeployUnconfirmedError.md), which covers the window
where the chain's answer is unknown. Here the answer arrived and it was
success, so the contract exists, its maintenance authority is built from this
error's key, and deploying again is the one thing a caller must not do.

Carries the signing key over BOTH writes even though only one of them can
strand it, because one class over the whole after-success region is what
makes the region's guarantee checkable: no `await` in it may reject without
the key riding along.

[Ledger8DeployNotStoredError.signingKey](#signingkey) is NAMED but never rendered,
for the reason [Ledger8DeployTxFailedError](DeployTxFailedError.md) states.

Carries no registered error code of its own, for the same reason
[Ledger8DeployUnconfirmedError](DeployUnconfirmedError.md) does not.

## Extends

- `Error`

## Constructors

### Constructor

> **new DeployNotStoredError**(`contractAddress`, `signingKey`, `stage`, `cause`): `Ledger8DeployNotStoredError`

#### Parameters

##### contractAddress

`string`

The address the confirmed deployment created.

##### signingKey

`string`

The key that deployment's maintenance authority was built
from - sampled when the caller named none.

##### stage

`"signing-key"` \| `"private-state"`

Which write the store refused. `'signing-key'` means this
error holds the only copy of the key; `'private-state'` means the key was
already stored and the local state is what is missing.

##### cause

`unknown`

What the private-state provider rejected with.

#### Returns

`Ledger8DeployNotStoredError`

#### Overrides

`Error.constructor`

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

The address the confirmed deployment created.

***

### signingKey

> `readonly` **signingKey**: `string`

The key that deployment's maintenance authority was built
from - sampled when the caller named none.

***

### stage

> `readonly` **stage**: `"signing-key"` \| `"private-state"`

Which write the store refused. `'signing-key'` means this
error holds the only copy of the key; `'private-state'` means the key was
already stored and the local state is what is missing.
