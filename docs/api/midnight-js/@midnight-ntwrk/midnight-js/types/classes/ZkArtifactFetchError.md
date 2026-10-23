[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ZkArtifactFetchError

# Class: ZkArtifactFetchError

A ZK artifact could not be fetched. `status` is the HTTP status, absent when the request itself failed.
A network failure, HTTP 408, 429 or 5xx is TRANSIENT; any other status is ENVIRONMENT.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ZkArtifactFetchError**(`message`, `status?`, `options?`): `ZkArtifactFetchError`

#### Parameters

##### message

`string`

##### status?

`number`

The HTTP status, absent when the request itself failed.

##### options?

`notServed` marks an answer that is not the artifact although its status is 2xx
  (an HTML fallback page).

###### cause?

`unknown`

###### notServed?

`boolean`

#### Returns

`ZkArtifactFetchError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED"` \| `"MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### status?

> `readonly` `optional` **status?**: `number`
