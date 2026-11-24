[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [utils](../README.md) / ZkArtifactIntegrityError

# Class: ZkArtifactIntegrityError

Thrown when a ZK artifact (or the manifest itself) fails integrity verification.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ZkArtifactIntegrityError**(`message`, `options?`): `ZkArtifactIntegrityError`

#### Parameters

##### message

`string`

##### options?

###### cause?

`unknown`

#### Returns

`ZkArtifactIntegrityError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_ZK_ARTIFACT_INTEGRITY_FAILED"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)
