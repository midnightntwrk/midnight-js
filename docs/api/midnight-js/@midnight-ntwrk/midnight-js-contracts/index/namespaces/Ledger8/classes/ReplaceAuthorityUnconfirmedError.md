[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / ReplaceAuthorityUnconfirmedError

# Class: ReplaceAuthorityUnconfirmedError

An error indicating that a retained-era maintenance authority REPLACEMENT was submitted, but
what the chain did with it could not be confirmed.

Covers every way that step fails after the transaction may have landed: a submission rejected
while the head was moving (a [StaleHeadError](../../../classes/StaleHeadError.md) or [SubmitRejectionUndiagnosedError](../../../classes/SubmitRejectionUndiagnosedError.md)
on `cause`), the read surface rejecting, a record with no era tag, or a record from an era the
head this replacement composed on cannot have recorded. The new key is NOT stored, because the
replacement may not have landed - and it may have, so this error carries it.

[Ledger8ReplaceAuthorityUnconfirmedError.signingKey](#signingkey) is NAMED but never rendered into the
message: if the replacement landed, it is the only key that authorizes anything on the contract.

## Extends

- [`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ReplaceAuthorityUnconfirmedError**(`contractAddress`, `signingKey`, `cause`): `Ledger8ReplaceAuthorityUnconfirmedError`

#### Parameters

##### contractAddress

`string`

The contract whose authority the replacement targets.

##### signingKey

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The key the replacement would install.

##### cause

`unknown`

Why the replacement could not be confirmed.

#### Returns

`Ledger8ReplaceAuthorityUnconfirmedError`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_REPLACE_AUTHORITY_UNCONFIRMED"` = `CONTRACTS_ERROR_CODES.LEDGER8_REPLACE_AUTHORITY_UNCONFIRMED`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The contract whose authority the replacement targets.

***

### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The key the replacement would install.
