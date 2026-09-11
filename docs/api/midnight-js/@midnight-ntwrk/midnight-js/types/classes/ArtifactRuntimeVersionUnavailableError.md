[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ArtifactRuntimeVersionUnavailableError

# Class: ArtifactRuntimeVersionUnavailableError

An error indicating that a [ZKConfigProvider](ZKConfigProvider.md) cannot report which `compact-runtime` its
artifact set was compiled against.

The retained-era pipeline establishes an artifact's era from that declared version, so a provider
that cannot serve it cannot be used with retained-era artifacts. Every provider this framework
ships can serve it; a provider written outside it may not, which is the case named here.

Raised rather than answered with a default, because every default would be a guess about which
ledger era a caller's artifacts belong to.

## Extends

- `Error`

## Constructors

### Constructor

> **new ArtifactRuntimeVersionUnavailableError**(`providerName`): `ArtifactRuntimeVersionUnavailableError`

#### Parameters

##### providerName

`string`

The runtime name of the provider that could not answer.

#### Returns

`ArtifactRuntimeVersionUnavailableError`

#### Overrides

`Error.constructor`

## Properties

### providerName

> `readonly` **providerName**: `string`
