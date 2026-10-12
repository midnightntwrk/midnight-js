[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ZKArtifactNotFoundError

# Class: ZKArtifactNotFoundError

Thrown when a contract key location parses but no artifact source contains a bundle whose
verifier key matches the deployed one — i.e. the local artifacts have drifted from (or were
never compiled for) the deployed contract.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ZKArtifactNotFoundError**(`keyLocation`, `suppressedErrors?`): `ZKArtifactNotFoundError`

#### Parameters

##### keyLocation

[`ContractKeyLocation`](https://github.com/midnightntwrk/midnight-sdk)

The location that could not be resolved.

##### suppressedErrors?

readonly `unknown`[] = `[]`

Errors raised by individual sources while probing their verifier key
(permission/IO failures, or a genuine absence of the circuit). They are attached as this error's
`cause` so none is lost. An integrity or transient failure is thrown instead of this error.

#### Returns

`ZKArtifactNotFoundError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_FOUND"` = `PROVIDER_ERROR_CODES.ZK_ARTIFACT_NOT_FOUND`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### keyLocation

> `readonly` **keyLocation**: [`ContractKeyLocation`](https://github.com/midnightntwrk/midnight-sdk)

The location that could not be resolved.

***

### suppressedErrors

> `readonly` **suppressedErrors**: readonly `unknown`[] = `[]`

Errors raised by individual sources while probing their verifier key
(permission/IO failures, or a genuine absence of the circuit). They are attached as this error's
`cause` so none is lost. An integrity or transient failure is thrown instead of this error.
