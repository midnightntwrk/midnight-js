[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / Ledger8ValueUnsupportedError

# Class: Ledger8ValueUnsupportedError

Raised by [requireLedger9](../functions/requireLedger9.md) when the value was written by the v8 ledger.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new Ledger8ValueUnsupportedError**(`context`): `Ledger8ValueUnsupportedError`

#### Parameters

##### context

`string`

Names the call site that handles only v9 values.

#### Returns

`Ledger8ValueUnsupportedError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_LEDGER8_VALUE_UNSUPPORTED"` = `UTILS_ERROR_CODES.LEDGER8_VALUE_UNSUPPORTED`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### context

> `readonly` **context**: `string`

Names the call site that handles only v9 values.
