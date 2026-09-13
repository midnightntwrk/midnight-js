[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / Ledger8RuntimeMissingError

# Class: Ledger8RuntimeMissingError

Thrown when a lazily-loaded subpath export carrying the retained pre-fork
runtime could not be acquired at all. Raised by `loadLedger8`
(`lib/v8/load.ts`) and `loadLedger8Engine` (`lib/v8/load-engine.ts`), and
surfaced through `createLedger8Engine` and `loadLedgerEra('v8')`.

A failed acquisition is not memoised: the next call retries the import.
Distinct from Ledger8RuntimeInvalidError, which reports a runtime
that WAS acquired and then handed over incomplete.

## Param

**subpath**

Which chunk failed to load — see [RetainedEraSubpath](../type-aliases/RetainedEraSubpath.md).

## Param

**cause**

The underlying module-resolution or initialisation failure,
  preserved unchanged. Read it for which module actually failed.

## See

 - ModuleGraphAndLazyLoading
 - EraSeam

## Extends

- `Error`

## Constructors

### Constructor

> **new Ledger8RuntimeMissingError**(`subpath`, `cause`): `Ledger8RuntimeMissingError`

#### Parameters

##### subpath

[`RetainedEraSubpath`](../type-aliases/RetainedEraSubpath.md)

##### cause

`unknown`

#### Returns

`Ledger8RuntimeMissingError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING"`

***

### subpath

> `readonly` **subpath**: [`RetainedEraSubpath`](../type-aliases/RetainedEraSubpath.md)
