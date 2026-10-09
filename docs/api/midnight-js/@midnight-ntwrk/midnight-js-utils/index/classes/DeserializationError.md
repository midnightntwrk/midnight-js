[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / DeserializationError

# Class: DeserializationError

An error thrown by the deserialization wrappers when a ledger /
compact-runtime / onchain-runtime `.deserialize`/`.decode` call fails.
Carries structured context for diagnosis: data type, call site,
classification, direction, mitigation.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new DeserializationError**(`context`, `cause?`): `DeserializationError`

#### Parameters

##### context

[`DeserializationContext`](../interfaces/DeserializationContext.md)

Structured diagnostic context.

##### cause?

`unknown`

Underlying error. Typed as `unknown` to match the
  `Error.cause` ECMA spec. Primary call sites (typed wrappers) always
  pass an `Error` via `withDeserializationContext`.

#### Returns

`DeserializationError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_DESERIALIZATION_FAILED"` = `UTILS_ERROR_CODES.DESERIALIZATION_FAILED`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### context

> `readonly` **context**: [`DeserializationContext`](../interfaces/DeserializationContext.md)
