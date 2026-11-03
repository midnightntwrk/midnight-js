[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / SerializedStateDecodeFailedError

# Class: SerializedStateDecodeFailedError

Thrown by `SerializedState.deserialize` when the decoder for the era of the value throws an error
that is not a `MidnightJsError`. The bytes carry the right tag, so either the bytes after the tag
are corrupt or the decoder is the wrong one (it decodes another kind, or comes from a runtime that
cannot read this era). Categorised `INTEGRITY`: the data and its decoder do not match. The
decoder's failure is the `cause`.

Catch it via its stable `code`, using `hasErrorCode` from `@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_LEDGER_STATE_DECODE_FAILED"` = `LEDGER_STATE_DECODE_FAILED`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

The ledger era that wrote the value.

***

### kind

> `readonly` **kind**: `"ContractState"` \| `"LedgerParameters"` \| `"ZswapChainState"`

The kind of the value.
