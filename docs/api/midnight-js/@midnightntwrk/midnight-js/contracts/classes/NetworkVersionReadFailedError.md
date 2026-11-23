[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / NetworkVersionReadFailedError

# Class: NetworkVersionReadFailedError

The network's ledger version could not be read: either re-reading it while checking an era disagreement failed,
or the public data provider returned no latest block to pin a call to. Retry when the read surface is
reachable; a transport failure, when there is one, is on `cause`.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new NetworkVersionReadFailedError**(`message`, `options?`): `NetworkVersionReadFailedError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`NetworkVersionReadFailedError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_NETWORK_VERSION_READ_FAILED"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)
