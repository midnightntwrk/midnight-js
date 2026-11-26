[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [utils](../README.md) / ZkArtifactContractInfoError

# Class: ZkArtifactContractInfoError

Thrown when a `compactc` `contract-info.json` cannot be read as one, or declares no runtime
version.

Distinct from [ZkArtifactIntegrityError](ZkArtifactIntegrityError.md): nothing here is a failed integrity check. The
file is the artifact set's own statement of which toolchain produced it, and this error says
that statement is missing or unreadable.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_ZK_ARTIFACT_CONTRACT_INFO_INVALID"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)
