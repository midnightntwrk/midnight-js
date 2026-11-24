[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / ZKArtifactNotFoundError

# Class: ZKArtifactNotFoundError

Thrown when a contract key location parses but no artifact source contains a bundle whose
verifier key matches the deployed one — i.e. the local artifacts have drifted from (or were
never compiled for) the deployed contract.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ZKArtifactNotFoundError**(`keyLocation`, `suppressedErrors?`): `ZKArtifactNotFoundError`

#### Parameters

##### keyLocation

[`ContractKeyLocation`](https://github.com/midnightntwrk/midnight-sdk)

The location that could not be resolved.

##### suppressedErrors?

readonly `unknown`[]

Errors raised by individual sources while probing their verifier key
(permission/IO failures, or a genuine absence of the circuit). They are attached as this error's
`cause` so none is lost. An integrity or transient failure is thrown instead of this error.

#### Returns

`ZKArtifactNotFoundError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_FOUND"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### keyLocation

> `readonly` **keyLocation**: [`ContractKeyLocation`](https://github.com/midnightntwrk/midnight-sdk)

***

### suppressedErrors

> `readonly` **suppressedErrors**: readonly `unknown`[]
