[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / ZkArtifactContractInfoError

# Class: ZkArtifactContractInfoError

Thrown when a `compactc` `contract-info.json` cannot be read as one, or declares no runtime
version.

Distinct from [ZkArtifactIntegrityError](ZkArtifactIntegrityError.md): nothing here is a failed integrity check. The
file is the artifact set's own statement of which toolchain produced it, and this error says
that statement is missing or unreadable.

## Extends

- `Error`

## Constructors

### Constructor

> **new ZkArtifactContractInfoError**(`message`, `options?`): `ZkArtifactContractInfoError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`ZkArtifactContractInfoError`

#### Overrides

`Error.constructor`
