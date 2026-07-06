[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ZKArtifactNotFoundError

# Class: ZKArtifactNotFoundError

Thrown when a contract key location parses but no artifact source contains a bundle whose
verifier key matches the deployed one — i.e. the local artifacts have drifted from (or were
never compiled for) the deployed contract.

## Extends

- `Error`

## Constructors

### Constructor

> **new ZKArtifactNotFoundError**(`keyLocation`, `suppressedErrors?`): `ZKArtifactNotFoundError`

#### Parameters

##### keyLocation

`ContractKeyLocation`

The location that could not be resolved.

##### suppressedErrors?

readonly `unknown`[] = `[]`

Errors raised by individual sources while probing their verifier key
(integrity violations, permission/IO failures, or a genuine absence of the circuit). They are
attached as this error's `cause` so a real failure — for example a `ZkArtifactIntegrityError` —
is not hidden behind the "missing or stale" message.

#### Returns

`ZKArtifactNotFoundError`

#### Overrides

`Error.constructor`

## Properties

### keyLocation

> `readonly` **keyLocation**: `ContractKeyLocation`

The location that could not be resolved.

***

### suppressedErrors

> `readonly` **suppressedErrors**: readonly `unknown`[] = `[]`

Errors raised by individual sources while probing their verifier key
(integrity violations, permission/IO failures, or a genuine absence of the circuit). They are
attached as this error's `cause` so a real failure — for example a `ZkArtifactIntegrityError` —
is not hidden behind the "missing or stale" message.
