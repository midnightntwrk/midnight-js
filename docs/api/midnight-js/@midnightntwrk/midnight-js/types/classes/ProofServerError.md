[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / ProofServerError

# Class: ProofServerError

The proof server could not be reached or did not accept the request.
A network failure, HTTP 408, 429 or 5xx is TRANSIENT; any other status is ENVIRONMENT.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ProofServerError**(`message`, `status?`, `options?`): `ProofServerError`

#### Parameters

##### message

`string`

##### status?

`number`

##### options?

`ErrorOptions`

#### Returns

`ProofServerError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE"` \| `"MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### status?

> `readonly` `optional` **status?**: `number`
