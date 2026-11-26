[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [utils](../README.md) / DeserializationError

# Class: DeserializationError

An error thrown by the deserialization wrappers when a ledger /
compact-runtime / onchain-runtime `.deserialize`/`.decode` call fails.
Carries structured context for diagnosis: data type, call site,
classification, direction, mitigation.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_DESERIALIZATION_FAILED"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### context

> `readonly` **context**: [`DeserializationContext`](../interfaces/DeserializationContext.md)
