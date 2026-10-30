[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / UnknownLedgerVersionError

# Class: UnknownLedgerVersionError

Thrown when a ledger era was requested by a value that is not a member of
`LEDGER_VERSIONS`. Raised by `loadLedgerEra` (`lib/era/load-era.ts`) and by
`extractEncodedStateValue` (`lib/era/envelope.ts`).

A TypeScript caller cannot produce this: `version` is typed as
`LedgerVersion`. It exists for the untyped JavaScript consumers this package
also serves.

Carries no `version` field, unlike every other era-aware error here — there
is no valid era to name.

## Param

**requestedVersion**

The offending value that was passed. Carried for
  programmatic use only; it is deliberately kept out of the message.

## Param

**context**

The call that read the version off a value it was handed,
  for example the provider method that returned a record. Named in the
  message, so a caller can tell which provider produced the value.

## See

 - SharedTableDiscipline
 - FailClosedDecoding

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new UnknownLedgerVersionError**(`requestedVersion`, `context?`): `UnknownLedgerVersionError`

#### Parameters

##### requestedVersion

`string`

##### context?

`string`

#### Returns

`UnknownLedgerVersionError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION"`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

***

### context?

> `readonly` `optional` **context?**: `string`

***

### requestedVersion

> `readonly` **requestedVersion**: `string`
