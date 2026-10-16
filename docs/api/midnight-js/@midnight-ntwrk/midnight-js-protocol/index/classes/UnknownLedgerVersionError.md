[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / UnknownLedgerVersionError

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

## See

 - [SharedTableDiscipline](../../documents/SharedTableDiscipline.md)
 - [FailClosedDecoding](../../documents/FailClosedDecoding.md)

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new UnknownLedgerVersionError**(`requestedVersion`): `UnknownLedgerVersionError`

#### Parameters

##### requestedVersion

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

> `readonly` **code**: `"MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION"` = `PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

***

### requestedVersion

> `readonly` **requestedVersion**: `string`
