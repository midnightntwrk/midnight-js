[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8SigningKeyError

# Class: Ledger8SigningKeyError

An error indicating that a signing key is not usable by the retained era.

`reason` is `'unusable'` when a key the caller supplied in this call - on a retained-era deploy, an
attach, or an authority replacement - is not one the retained era can sign with. It is refused
BEFORE anything is composed or stored. Stored unchecked, a key the read rejects is reported on the
attach that supplied it and read as ABSENT on every later one, and the bad entry has by then
already replaced whatever was held there. The caller can correct it, because the value came from
the caller, in this call.

`reason` is `'unavailable'` when a retained-era maintenance update found no signing key it can
sign with for the contract it targets: nothing is stored for the address, the stored entry is not
a retained-era key, or the store could not be read, in which case the read failure is on `cause`.
Raised before anything is composed or proven. Unlike an attach, which reports an unusable entry as
absent, a maintenance update cannot proceed without the key.

The key is never rendered, and is not carried as a member: the caller already holds it, or has none.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new Ledger8SigningKeyError**(`reason`, `contractAddress?`): `Ledger8SigningKeyError`

#### Parameters

##### reason

`"unusable"`

Which way the key could not be used. Also the discriminant a caller branches on.

##### contractAddress?

`string`

The address the key was supplied for or looked up under. `undefined` for a
deploy, which has no address until it is composed.

#### Returns

`Ledger8SigningKeyError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

### Constructor

> **new Ledger8SigningKeyError**(`reason`, `contractAddress`, `options?`): `Ledger8SigningKeyError`

#### Parameters

##### reason

`"unavailable"`

##### contractAddress

`string`

##### options?

`ErrorOptions`

#### Returns

`Ledger8SigningKeyError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_SIGNING_KEY"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### contractAddress?

> `readonly` `optional` **contractAddress?**: `string`

***

### reason

> `readonly` **reason**: [`Ledger8SigningKeyReason`](../type-aliases/Ledger8SigningKeyReason.md)
