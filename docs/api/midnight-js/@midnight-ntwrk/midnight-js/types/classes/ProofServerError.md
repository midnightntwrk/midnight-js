[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ProofServerError

# Class: ProofServerError

The proof server could not be reached or did not accept the request.
A network failure, HTTP 408, 429 or 5xx is TRANSIENT; any other status is ENVIRONMENT.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

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

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE"` \| `"MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### status?

> `readonly` `optional` **status?**: `number`
