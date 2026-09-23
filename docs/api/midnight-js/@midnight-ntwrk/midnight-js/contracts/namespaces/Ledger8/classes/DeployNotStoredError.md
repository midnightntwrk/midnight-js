[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / DeployNotStoredError

# Class: DeployNotStoredError

An error indicating that a retained-era deployment was CONFIRMED on chain,
but the private-state provider refused to record it locally.

Distinct from [Ledger8DeployUnconfirmedError](DeployUnconfirmedError.md), which covers the window
where the chain's answer is unknown. Here the answer arrived and it was
success, so the contract EXISTS and its maintenance authority is built from
this error's key. DO NOT DEPLOY AGAIN.

Carries the signing key over both writes, and [stage](#stage) says which one
the store refused.

[Ledger8DeployNotStoredError.signingKey](#signingkey) is NAMED but never rendered
into the message.

Carries no registered error code of its own.

## See

[ErrorTaxonomy](../../../../documents/ErrorTaxonomy.md) for the after-submission region this closes and
why the key rides along even where only one write can strand it.

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

***

### signingKey

> `readonly` **signingKey**: `string`

***

### stage

> `readonly` **stage**: `"signing-key"` \| `"private-state"`
