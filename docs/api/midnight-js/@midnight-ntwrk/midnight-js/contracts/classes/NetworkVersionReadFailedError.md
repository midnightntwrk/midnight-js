[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / NetworkVersionReadFailedError

# Class: NetworkVersionReadFailedError

The network's ledger version could not be read: either re-reading it while checking an era disagreement failed,
or the public data provider returned no latest block to pin a call to. Retry when the read surface is
reachable; a transport failure, when there is one, is on `cause`.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

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

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_NETWORK_VERSION_READ_FAILED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)
