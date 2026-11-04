[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / UnknownLedgerEraError

# Class: UnknownLedgerEraError

Thrown when a ledger era was requested by a value that is not a member of
`LEDGER_ERAS`. Raised by `loadLedgerEra` (`lib/era/load-era.ts`) and by
`extractEncodedStateValue` (`lib/era/envelope.ts`).

Two sources: an untyped JavaScript caller passing a value that is not a
`LedgerEra`, and a provider returning a value with no era or an unknown
one. The second is named by `context`.

Carries no `version` field, unlike every other era-aware error here — there
is no valid era to name.

## Param

**requestedVersion**

The offending value. Kept as `undefined` when the
  value carried no era, as the kind (`'object'`, `'function'`) for a value
  that is not a scalar, and as its string form otherwise. Carried for
  programmatic use only; it is deliberately kept out of the message.

## Param

**context**

The call that read the era off a value it was handed,
  for example the provider method that returned a record. Named in the
  message, so a caller can tell which provider produced the value.

## See

 - SharedTableDiscipline
 - FailClosedDecoding

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new UnknownLedgerEraError**(`requestedVersion`, `context?`): `UnknownLedgerEraError`

#### Parameters

##### requestedVersion

`unknown`

##### context?

`string`

#### Returns

`UnknownLedgerEraError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_UNKNOWN_LEDGER_ERA"`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

***

### context?

> `readonly` `optional` **context?**: `string`

***

### requestedVersion

> `readonly` **requestedVersion**: `string` \| `undefined`
