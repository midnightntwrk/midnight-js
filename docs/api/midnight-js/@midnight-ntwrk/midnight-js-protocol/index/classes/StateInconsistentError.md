[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / StateInconsistentError

# Class: StateInconsistentError

Thrown by `decodeContractState` (`lib/shared/contract-state.ts`) when the
era's decoder read the envelope but the state it produced is internally
inconsistent: it declares an entry point it resolves no operation for, holds
a verifier key that will not hash, or resolves no usable balance.

Distinct from [StateDecodeFailedError](StateDecodeFailedError.md): the bytes were readable by the
requested era, so decoding them as the other era cannot help. A caller that
retries on `STATE_DECODE_FAILED` must not retry on this one.

Renders no hex and no decoded state contents of its own.

## Param

**version**

The era whose decoder produced the state.

## Param

**cause**

The diagnosis of what was inconsistent, preserved unchanged.

## See

[FailClosedDecoding](../../documents/FailClosedDecoding.md)

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new StateInconsistentError**(`version`, `cause`): `StateInconsistentError`

#### Parameters

##### version

`"v8"` \| `"v9"`

##### cause

`unknown`

#### Returns

`StateInconsistentError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_STATE_INCONSISTENT"` = `PROTOCOL_ERROR_CODES.STATE_INCONSISTENT`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

***

### version

> `readonly` **version**: `"v8"` \| `"v9"`
