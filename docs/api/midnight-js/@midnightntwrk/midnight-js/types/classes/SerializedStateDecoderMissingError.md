[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / SerializedStateDecoderMissingError

# Class: SerializedStateDecoderMissingError

Thrown by `deserialize` of a serialized state when the decoders passed in have none for the era of the
value. The message names the class to import.

Catch it via its stable `code`, using `hasErrorCode` from `@midnightntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_LEDGER_STATE_DECODER_MISSING"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

***

### kind

> `readonly` **kind**: `"ContractState"` \| `"LedgerParameters"` \| `"ZswapChainState"`
