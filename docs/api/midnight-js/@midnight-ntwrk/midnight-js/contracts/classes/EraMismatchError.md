[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / EraMismatchError

# Class: EraMismatchError

An error indicating that a value the caller passed does not belong to the era the operation can
execute — or to either era. The value is a contract, an artifact set, a transaction, a scope, a
result, or a contract state read from the chain.

Raised before anything is proved or submitted, except `'unrecognised-result-era'`, which is raised
when a result that came back from the chain is read.

## See

[EraDispatch](../../documents/EraDispatch.md) for how the era is established and which pairings are refused.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new EraMismatchError**(`reason`, `options?`): `EraMismatchError`

#### Parameters

##### reason

[`EraMismatchReason`](../type-aliases/EraMismatchReason.md)

Which era mismatch this is. Also the discriminant a caller branches on, so it is
              retained on the error rather than only rendered.

##### options?

[`EraMismatchOptions`](../interfaces/EraMismatchOptions.md)

Carries the originating failure on `cause` -- a provider that could not serve the
               artifact description reports WHY there -- and an optional `detail` naming the
               value that was seen.

#### Returns

`EraMismatchError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### circuitId?

> `readonly` `optional` **circuitId?**: `string`

The circuit the refused call names, for `'ledger8-call-in-scope'`.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_ERA_MISMATCH"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### contractAddress?

> `readonly` `optional` **contractAddress?**: `string`

The contract the refused value belongs to, for the reasons that have one.

***

### detail?

> `readonly` `optional` **detail?**: `string`

The sentence appended to the reason's wording, naming the value that was seen.

***

### reason

> `readonly` **reason**: [`EraMismatchReason`](../type-aliases/EraMismatchReason.md)
