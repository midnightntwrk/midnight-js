[**Midnight.js API Reference v5.0.0-rc.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / TransactionDecodeFailedError

# Class: TransactionDecodeFailedError

Thrown by `LedgerTransaction.deserialize` when the decoder for the era of the handle throws an
error that is not a `MidnightJsError`. The bytes carry the right header, so either the bytes after
it are corrupt or the decoder is the wrong one. Also raised inside a provider of this framework
that decodes the handle it receives, with no decoder passed by the caller. Categorised
`INTEGRITY`. The decoder's failure is the `cause`.

Catch it via its stable `code`, using `hasErrorCode` from `@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new TransactionDecodeFailedError**(`era`, `stage`, `options`): `TransactionDecodeFailedError`

#### Parameters

##### era

`"v8"` \| `"v9"`

The era of the handle.

##### stage

`"Unproven"` \| `"Unbound"` \| `"Finalized"`

The stage of the handle.

##### options

Carries the decoder's failure as `cause`.

###### cause

`unknown`

#### Returns

`TransactionDecodeFailedError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_TRANSACTION_DECODE_FAILED"` = `TRANSACTION_DECODE_FAILED`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

The era of the handle.

***

### stage

> `readonly` **stage**: `"Unproven"` \| `"Unbound"` \| `"Finalized"`

The stage of the handle.
