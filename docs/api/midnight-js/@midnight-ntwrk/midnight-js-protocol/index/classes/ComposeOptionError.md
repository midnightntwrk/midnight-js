[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ComposeOptionError

# Class: ComposeOptionError

Thrown by the composition legs when one of their options cannot be used at
all, as opposed to [ComposeFailedError](ComposeFailedError.md), which reports a circuit whose
operation is missing or under-registered.

These are the well-formedness checks the ledger itself does not make.

Like [DownConvertFailedError](DownConvertFailedError.md), this class renders no input contents of
its own.

## Param

**version**

The ledger era the option was being used against.

## Param

**option**

Which option was unusable — see [ComposeOption](../type-aliases/ComposeOption.md). A
  closed union, so a consumer can `switch` on it exhaustively.

## Param

**cause**

The decoder's own failure, present only for `'contractState'`
  and `'zswapOffer'`, where caller-supplied bytes were rejected.

## See

 - [ComposeRefusalOrder](../../documents/ComposeRefusalOrder.md)
 - [VerifierKeys](../../documents/VerifierKeys.md)

## Extends

- `Error`

## Constructors

### Constructor

> **new ComposeOptionError**(`version`, `option`, `cause?`): `ComposeOptionError`

#### Parameters

##### version

`"v8"` \| `"v9"`

##### option

[`ComposeOption`](../type-aliases/ComposeOption.md)

##### cause?

`unknown`

#### Returns

`ComposeOptionError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_COMPOSE_OPTION_INVALID"` = `PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID`

***

### option

> `readonly` **option**: [`ComposeOption`](../type-aliases/ComposeOption.md)

***

### version

> `readonly` **version**: `"v8"` \| `"v9"`
