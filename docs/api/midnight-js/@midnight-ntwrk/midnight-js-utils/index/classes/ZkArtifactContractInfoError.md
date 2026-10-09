[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / ZkArtifactContractInfoError

# Class: ZkArtifactContractInfoError

Thrown when a `compactc` `contract-info.json` cannot be read as one, or declares no runtime
version.

Distinct from [ZkArtifactIntegrityError](ZkArtifactIntegrityError.md): nothing here is a failed integrity check. The
file is the artifact set's own statement of which toolchain produced it, and this error says
that statement is missing or unreadable.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_ZK_ARTIFACT_CONTRACT_INFO_INVALID"` = `UTILS_ERROR_CODES.ZK_ARTIFACT_CONTRACT_INFO_INVALID`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)
