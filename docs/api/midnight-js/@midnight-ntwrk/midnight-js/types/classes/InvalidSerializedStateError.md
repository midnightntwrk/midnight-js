[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / InvalidSerializedStateError

# Class: InvalidSerializedStateError

Thrown by the `fromBytes` of `SerializedContractState`, `SerializedLedgerParameters` and
`SerializedZswapChainState` when the bytes are not a value of that kind written by the ledger of the
given era, and by their constructors when called without `fromBytes`. The bytes are never quoted in
the message.

Catch it via its stable `code`, using `hasErrorCode` from `@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new InvalidSerializedStateError**(`kind`, `era`, `reason`): `InvalidSerializedStateError`

#### Parameters

##### kind

`"ContractState"` \| `"LedgerParameters"` \| `"ZswapChainState"`

The kind of value the class carries.

##### era

`"v8"` \| `"v9"` \| `undefined`

The ledger era the caller named, or `undefined` when the constructor was called
  directly.

##### reason

[`InvalidSerializedStateReason`](../type-aliases/InvalidSerializedStateReason.md)

Why the value was refused.

#### Returns

`InvalidSerializedStateError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_INVALID_LEDGER_STATE"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"` \| `undefined`

***

### kind

> `readonly` **kind**: `"ContractState"` \| `"LedgerParameters"` \| `"ZswapChainState"`

***

### reason

> `readonly` **reason**: [`InvalidSerializedStateReason`](../type-aliases/InvalidSerializedStateReason.md)
