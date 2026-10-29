[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / SerializedStateDecodeFailedError

# Class: SerializedStateDecodeFailedError

Thrown by `SerializedState.deserialize` when the decoder for the era of the value throws an error
that is not a `MidnightJsError`. The bytes carry the right tag, so either the bytes after the tag
are corrupt or the decoder is the wrong one (it decodes another kind, or comes from a runtime that
cannot read this era). Categorised `INTEGRITY`: the data and its decoder do not match. The
decoder's failure is the `cause`.

Catch it via its stable `code`, using `hasErrorCode` from `@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new SerializedStateDecodeFailedError**(`kind`, `era`, `options`): `SerializedStateDecodeFailedError`

#### Parameters

##### kind

`"ContractState"` \| `"LedgerParameters"` \| `"ZswapChainState"`

The kind of the value.

##### era

`"v8"` \| `"v9"`

The ledger era that wrote the value.

##### options

Carries the decoder's failure as `cause`.

###### cause

`unknown`

#### Returns

`SerializedStateDecodeFailedError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_LEDGER_STATE_DECODE_FAILED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

***

### kind

> `readonly` **kind**: `"ContractState"` \| `"LedgerParameters"` \| `"ZswapChainState"`
