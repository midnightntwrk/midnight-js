[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8NotStoredError

# Class: Ledger8NotStoredError

An error indicating that a retained-era operation was CONFIRMED on chain, but the private-state
provider refused to record it locally.

`operation` `'deploy'`: distinct from [Ledger8UnconfirmedError](Ledger8UnconfirmedError.md), which covers the window where
the chain's answer is unknown. Here the answer arrived and it was success, so the contract EXISTS
and its maintenance authority is built from this error's key. DO NOT DEPLOY AGAIN. `stage` says
which of the two writes the store refused.

`operation` `'replace-authority'`: a maintenance authority REPLACEMENT was confirmed, and the store
refused the new key (`stage` is `'signing-key'`). The key held before no longer authorizes anything
on the contract, so this is the only copy of the one that does.

[Ledger8NotStoredError.signingKey](#signingkey) is NAMED but never rendered into the message, and is
not enumerable.

## See

[ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for the after-submission region this closes and why the key rides along
even where only one write can strand it.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new Ledger8NotStoredError**(`operation`, `contractAddress`, `signingKey`, `stage`, `cause`): `Ledger8NotStoredError`

#### Parameters

##### operation

`"deploy"`

Which confirmed operation the store refused to record.

##### contractAddress

`string`

The address the confirmed deployment created, or the contract whose
authority was replaced.

##### signingKey

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The key the contract's maintenance authority was built from, or the new
authority's key.

##### stage

[`Ledger8NotStoredStage`](../type-aliases/Ledger8NotStoredStage.md)

Which write the store refused. `'signing-key'` means this error holds the only copy
of the key; `'private-state'` means the key was already stored and the local state is what is
missing.

##### cause

`unknown`

What the private-state provider rejected with.

#### Returns

`Ledger8NotStoredError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

### Constructor

> **new Ledger8NotStoredError**(`operation`, `contractAddress`, `signingKey`, `stage`, `cause`): `Ledger8NotStoredError`

#### Parameters

##### operation

`"replace-authority"`

##### contractAddress

`string`

##### signingKey

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

##### stage

`"signing-key"`

##### cause

`unknown`

#### Returns

`Ledger8NotStoredError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_NOT_STORED"` = `CONTRACTS_ERROR_CODES.LEDGER8_NOT_STORED`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

***

### operation

> `readonly` **operation**: [`Ledger8KeyedOperation`](../type-aliases/Ledger8KeyedOperation.md)

***

### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

***

### stage

> `readonly` **stage**: [`Ledger8NotStoredStage`](../type-aliases/Ledger8NotStoredStage.md)
