[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / SigningKeyUnusableError

# Class: SigningKeyUnusableError

An error indicating that a signing key the caller supplied in this call - on a
retained-era deploy, an attach, or an authority replacement - is not one the
retained era can sign with.

Refused BEFORE anything is composed or stored. Stored unchecked, a key the
read rejects is reported on the attach that supplied it and read as ABSENT on
every later one - the same store answering two different things about the
same address, with nothing erroring - and the bad entry has by then already
replaced whatever was held there.

A refusal is cheap here in a way it is not on the attach's READ path, which
reports an unusable stored entry as absent instead: this value came from the
caller, in this call, so the caller can correct it.

The key is not rendered, and is not carried as a member either: the caller
already holds it.

## Extends

- [`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new SigningKeyUnusableError**(`contractAddress?`): `Ledger8SigningKeyUnusableError`

#### Parameters

##### contractAddress?

`string`

The address the key was supplied for, or `undefined`
for a deploy, which has no address until it is composed.

#### Returns

`Ledger8SigningKeyUnusableError`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_SIGNING_KEY_UNUSABLE"` = `CONTRACTS_ERROR_CODES.LEDGER8_SIGNING_KEY_UNUSABLE`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress?

> `readonly` `optional` **contractAddress?**: `string`

The address the key was supplied for, or `undefined`
for a deploy, which has no address until it is composed.
