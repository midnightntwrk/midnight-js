[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / ZswapOutputResolutionError

# Class: ZswapOutputResolutionError

A Zswap output or its recipient's encryption key could not be resolved for this transaction.

## Extends

- [`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`category`](../../../midnight-js/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_ZSWAP_OUTPUT_UNRESOLVED"` = `CONTRACTS_ERROR_CODES.ZSWAP_OUTPUT_UNRESOLVED`

#### Overrides

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`code`](../../../midnight-js/index/classes/MidnightJsError.md#code)
