[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / ArtifactRuntimeVersionUnavailableError

# Class: ArtifactRuntimeVersionUnavailableError

An error indicating that a [ZKConfigProvider](ZKConfigProvider.md) cannot report which `compact-runtime` its
artifact set was compiled against.

Every contract operation establishes an artifact's era from that declared version, so a provider
that cannot serve it cannot be used for contract operations. Every provider this framework ships
can serve it; a provider written outside it may not, which is the case named here.

Raised rather than answered with a default, because every default would be a guess about which
ledger era a caller's artifacts belong to.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_ARTIFACT_RUNTIME_VERSION_UNAVAILABLE"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### providerName

> `readonly` **providerName**: `string`
