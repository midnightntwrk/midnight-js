[**Midnight.js API Reference v5.0.0-rc.4**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / SigningKeyUnusableError

# Class: SigningKeyUnusableError

An error indicating that the `signingKey` supplied on a retained-era attach
is not one this framework can store and read back.

Refused BEFORE the write rather than after it. Stored unchecked, a key the
read rejects is reported on the attach that supplied it and read as ABSENT on
every later one - the same store answering two different things about the
same address, with nothing erroring - and the bad entry has by then already
replaced whatever was held there.

A refusal is cheap here in a way it is not on the READ path, which reports an
unusable stored entry as absent instead: this value came from the caller, in
this call, so the caller can correct it.

The key is not rendered, and is not carried as a member either: the caller
already holds it.

## Extends

- [`MidnightJsError`](../../../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new SigningKeyUnusableError**(`contractAddress`): `Ledger8SigningKeyUnusableError`

#### Parameters

##### contractAddress

`string`

The address the key was supplied for.

#### Returns

`Ledger8SigningKeyUnusableError`

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`constructor`](../../../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`category`](../../../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_SIGNING_KEY_UNUSABLE"`

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`code`](../../../../classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`
