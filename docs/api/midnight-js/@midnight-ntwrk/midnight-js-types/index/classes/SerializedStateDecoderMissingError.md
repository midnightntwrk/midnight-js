[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / SerializedStateDecoderMissingError

# Class: SerializedStateDecoderMissingError

Thrown by `SerializedState.deserialize` when the decoders passed in have none for the era of the
value. The message names the class to import.

Catch it via its stable `code`, using `hasErrorCode` from `@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new SerializedStateDecoderMissingError**(`kind`, `era`): `SerializedStateDecoderMissingError`

#### Parameters

##### kind

`"ContractState"` \| `"LedgerParameters"` \| `"ZswapChainState"`

The kind of the value.

##### era

`"v8"` \| `"v9"`

The ledger era that wrote the value.

#### Returns

`SerializedStateDecoderMissingError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_LEDGER_STATE_DECODER_MISSING"` = `LEDGER_STATE_DECODER_MISSING`

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
