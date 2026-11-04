[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8UnconfirmedError

# Class: Ledger8UnconfirmedError

An error indicating that a retained-era transaction carrying a signing key was submitted, but what
the chain did with it could not be confirmed.

`operation` `'deploy'`: covers the read surface rejecting, a record whose version tag is missing or
unrecognised, and a record arriving from an era the network this deployment composed on cannot have
recorded. DO NOT DEPLOY AGAIN on seeing this. The transaction may still finalize, this error holds
the only copy of the signing key, and the address has to be checked first. Reachable only AFTER
submission: every refusal ahead of it is raised with no key having been sampled.

`operation` `'replace-authority'`: covers a submission rejected while the network was crossing the
fork (a [ForkCrossedDuringOperationError](ForkCrossedDuringOperationError.md) or [SubmitRejectionUndiagnosedError](SubmitRejectionUndiagnosedError.md) on
`cause`), the read surface rejecting, a record with no era tag, or a record from an era the network
cannot have recorded. The new key is NOT stored, because the replacement may not have landed - and
it may have, so this error carries it.

Branch on `cause` for the underlying failure. It is wrapped rather than replaced, so a
`cause instanceof EraInvariantViolationError`, its method and its registered code stay reachable.

[Ledger8UnconfirmedError.signingKey](#signingkey) is NAMED but never rendered into the message, and is
not enumerable.

## See

[ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for why one class covers the whole window.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new Ledger8UnconfirmedError**(`operation`, `contractAddress`, `signingKey`, `cause`): `Ledger8UnconfirmedError`

#### Parameters

##### operation

[`Ledger8KeyedOperation`](../type-aliases/Ledger8KeyedOperation.md)

Which submitted operation could not be confirmed.

##### contractAddress

`string`

The address the submitted deployment composed, or the contract whose
authority the replacement targets.

##### signingKey

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The key that deployment's maintenance authority was built from, or the key the
replacement would install. Sampled when the caller named none, and then this is its only copy.

##### cause

`unknown`

Why the operation could not be confirmed.

#### Returns

`Ledger8UnconfirmedError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_UNCONFIRMED"` = `CONTRACTS_ERROR_CODES.LEDGER8_UNCONFIRMED`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address the submitted deployment composed, or the contract whose
authority the replacement targets.

***

### operation

> `readonly` **operation**: [`Ledger8KeyedOperation`](../type-aliases/Ledger8KeyedOperation.md)

Which submitted operation could not be confirmed.

***

### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)
