[**Midnight.js API Reference v5.0.0-rc.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / InvariantViolationError

# Class: InvariantViolationError

A condition midnight-js guarantees did not hold. This is a midnight-js bug; report it.

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new InvariantViolationError**(`message`, `options?`): `InvariantViolationError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`InvariantViolationError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_G_INVARIANT_VIOLATED"`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)
