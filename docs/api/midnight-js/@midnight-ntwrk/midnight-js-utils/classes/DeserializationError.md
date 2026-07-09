[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / DeserializationError

# Class: DeserializationError

An error thrown by the deserialization wrappers when a ledger /
compact-runtime / onchain-runtime `.deserialize`/`.decode` call fails.
Carries structured context for diagnosis: data type, call site,
classification, direction, mitigation.

## Extends

- `Error`

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

`Error.constructor`

## Properties

### context

> `readonly` **context**: [`DeserializationContext`](../interfaces/DeserializationContext.md)
