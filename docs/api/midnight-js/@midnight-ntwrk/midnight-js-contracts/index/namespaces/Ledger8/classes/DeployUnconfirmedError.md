[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / DeployUnconfirmedError

# Class: DeployUnconfirmedError

An error indicating that a retained-era deployment was submitted, but what
the chain did with it could not be confirmed.

Covers every way that step fails: the read surface rejecting, a record whose
version tag is missing or unrecognised, and a record that arrives from an era
the head this deployment composed on cannot have recorded. One class over all
of them because the caller's action is the same in each - the transaction may
still finalize, this error holds the only copy of the signing key, and the
address has to be checked before deploying again. One class does not mean one
message: the wording states which condition was hit.

Wraps the underlying failure on `cause` rather than replacing it: the reason
the deployment is unconfirmed - an unreachable indexer, a timeout, an
untagged payload, an era violation - is what a caller branches on, and this
class adds the one fact that failure cannot carry, which is the key the
submitted deployment was built with. An era violation reaching `cause`
unchanged is what keeps `cause instanceof EraInvariantViolationError`, its
seam and its registered code reachable.

Reachable only AFTER submission. Every refusal ahead of it is raised with no
key having been sampled.

Carries no registered error code of its own, for the same reason
[Ledger8DeployTxFailedError](DeployTxFailedError.md) does not.

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
