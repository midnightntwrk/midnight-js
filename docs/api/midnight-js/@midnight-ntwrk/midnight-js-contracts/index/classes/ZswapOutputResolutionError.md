[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / ZswapOutputResolutionError

# Class: ZswapOutputResolutionError

A Zswap output or its recipient's encryption key could not be resolved for this transaction.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ZswapOutputResolutionError**(`message`, `options?`): `ZswapOutputResolutionError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`ZswapOutputResolutionError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_ZSWAP_OUTPUT_UNRESOLVED"` = `CONTRACTS_ERROR_CODES.ZSWAP_OUTPUT_UNRESOLVED`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)
