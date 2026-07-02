[**Midnight.js API Reference v5.0.0-alpha.1**](../../../README.md)

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

> **new ZKArtifactNotFoundError**(`keyLocation`): `ZKArtifactNotFoundError`

#### Parameters

##### keyLocation

`ContractKeyLocation`

#### Returns

`ZKArtifactNotFoundError`

#### Overrides

`Error.constructor`

## Properties

### keyLocation

> `readonly` **keyLocation**: `ContractKeyLocation`
