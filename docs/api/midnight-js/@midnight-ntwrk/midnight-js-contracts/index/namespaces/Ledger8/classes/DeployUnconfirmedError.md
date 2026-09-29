[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / DeployUnconfirmedError

# Class: DeployUnconfirmedError

An error indicating that a retained-era deployment was submitted, but what
the chain did with it could not be confirmed.

Covers every way that step fails: the read surface rejecting, a record whose
version tag is missing or unrecognised, and a record arriving from an era the
head this deployment composed on cannot have recorded. The message states
which condition was hit.

DO NOT DEPLOY AGAIN on seeing this. The transaction may still finalize, this
error holds the only copy of the signing key, and the address has to be
checked first.

Branch on `cause` for the underlying failure — an unreachable indexer, a
timeout, an untagged payload, an era violation. It is wrapped rather than
replaced, so `cause instanceof EraInvariantViolationError`, its seam and its
registered code all stay reachable.

Reachable only AFTER submission. Every refusal ahead of it is raised with no
key having been sampled.

Carries no registered error code of its own.

## See

[ErrorTaxonomy](../../../../documents/ErrorTaxonomy.md) for why one class covers the whole window.

## Extends

- `Error`

## Constructors

### Constructor

> **new DeployUnconfirmedError**(`contractAddress`, `signingKey`, `cause`): `Ledger8DeployUnconfirmedError`

#### Parameters

##### contractAddress

`string`

The address the submitted deployment composed.

##### signingKey

`string`

The key that deployment's maintenance authority was built
from - sampled when the caller named none, and then this is its only copy.

##### cause

`unknown`

Why the deployment could not be confirmed: the read surface's
own rejection, or the [EraInvariantViolationError](../../../classes/EraInvariantViolationError.md) the record was
refused by.

#### Returns

`Ledger8DeployUnconfirmedError`

#### Overrides

`Error.constructor`

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

The address the submitted deployment composed.

***

### signingKey

> `readonly` **signingKey**: `string`

The key that deployment's maintenance authority was built
from - sampled when the caller named none, and then this is its only copy.
