[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / SigningKeyUnavailableError

# Class: SigningKeyUnavailableError

An error indicating that a retained-era maintenance update found no signing key it can sign with
for the contract it targets.

Covers three cases a caller remedies the same way: nothing is stored for the address, the stored
entry is not a retained-era key, or the store could not be read, in which case the read failure is
on `cause`. Raised before anything is composed or proven.

Unlike an attach, which reports an unusable entry as absent, a maintenance update cannot proceed
without the key, so the absence is a refusal here. The key is never rendered.

## Extends

- [`MidnightJsError`](../../../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new SigningKeyUnavailableError**(`contractAddress`, `cause?`): `Ledger8SigningKeyUnavailableError`

#### Parameters

##### contractAddress

`string`

The contract the maintenance update targets.

##### cause?

`unknown`

The store's own failure, when the entry could not be read at all.

#### Returns

`Ledger8SigningKeyUnavailableError`

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`constructor`](../../../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`category`](../../../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_SIGNING_KEY_UNAVAILABLE"`

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`code`](../../../../classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`
