[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / PublicStatesEraMismatchError

# Class: PublicStatesEraMismatchError

An error indicating that the read surface served the ledger parameters or the zswap chain state of
a contract written by another ledger era than the one the call is built on, or did not serve them.
One read carries the states of one era, so the states cannot be combined into a call.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new PublicStatesEraMismatchError**(`contractAddress`, `field`, `expected`, `received`): `PublicStatesEraMismatchError`

#### Parameters

##### contractAddress

`string`

The contract whose public states were read.

##### field

`"ledgerParameters"` \| `"zswapChainState"`

The state that does not match the call.

##### expected

`"v9"` \| `"v8"`

The ledger era the call is built on.

##### received

`"v9"` \| `"v8"` \| `undefined`

The era of that state, or `undefined` when it was missing.

#### Returns

`PublicStatesEraMismatchError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_PUBLIC_STATES_ERA_MISMATCH"` = `CONTRACTS_ERROR_CODES.PUBLIC_STATES_ERA_MISMATCH`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The contract whose public states were read.

***

### expected

> `readonly` **expected**: `"v9"` \| `"v8"`

The ledger era the call is built on.

***

### field

> `readonly` **field**: `"ledgerParameters"` \| `"zswapChainState"`

The state that does not match the call.

***

### received

> `readonly` **received**: `"v9"` \| `"v8"` \| `undefined`

The era of that state, or `undefined` when it was missing.
