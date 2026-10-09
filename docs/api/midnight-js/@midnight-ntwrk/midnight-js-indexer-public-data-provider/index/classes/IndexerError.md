[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerError

# Abstract Class: IndexerError

Base class for the errors this provider raises itself. Consumers can catch
them with a single `instanceof IndexerError` check.

NOT EXHAUSTIVE OVER A READ. Two failure classes deliberately escape this
check: `DeserializationError` (`@midnight-ntwrk/midnight-js-utils`) and
`Ledger8RuntimeMissingError` (`@midnight-ntwrk/midnight-js-protocol`). Both
are `MidnightJsError`s, so `isMidnightJsError` recognises them as well as
every `IndexerError`. A failure from a dependency can still pass through
uncoded.

To branch on one failure, match on `code` via `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## See

[ErrorBoundaries](../../documents/ErrorBoundaries.md) for what each escaping class reports, and why
wrapping it here would mislead.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Extended by

- [`IndexerFormattedError`](IndexerFormattedError.md)
- [`IndexerQueryError`](IndexerQueryError.md)
- [`IndexerDataError`](IndexerDataError.md)
- [`IndexerSubscriptionDataError`](IndexerSubscriptionDataError.md)
- [`IndexerProviderConfigError`](IndexerProviderConfigError.md)
- [`IndexerInvariantError`](IndexerInvariantError.md)
- [`EraUnsupportedError`](EraUnsupportedError.md)
- [`EraUnresolvableError`](EraUnresolvableError.md)
- [`IndexerPayloadTooLargeError`](IndexerPayloadTooLargeError.md)

## Constructors

### Constructor

> **new IndexerError**(`message?`): `IndexerError`

#### Parameters

##### message?

`string`

#### Returns

`IndexerError`

#### Inherited from

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

### Constructor

> **new IndexerError**(`message?`, `options?`): `IndexerError`

#### Parameters

##### message?

`string`

##### options?

`ErrorOptions`

#### Returns

`IndexerError`

#### Inherited from

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `abstract` `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Inherited from

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `abstract` `readonly` **code**: `` `MIDNIGHT_JS_${string}` ``

#### Inherited from

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)
