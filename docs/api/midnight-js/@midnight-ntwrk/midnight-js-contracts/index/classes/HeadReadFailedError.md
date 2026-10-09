[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / HeadReadFailedError

# Class: HeadReadFailedError

The network head could not be read: either re-reading it while checking an era disagreement failed,
or the public data provider returned no latest block to pin a call to. Retry when the read surface is
reachable; a transport failure, when there is one, is on `cause`.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new HeadReadFailedError**(`message`, `options?`): `HeadReadFailedError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`HeadReadFailedError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_HEAD_READ_FAILED"` = `CONTRACTS_ERROR_CODES.HEAD_READ_FAILED`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)
