[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / PublicStatesEraMismatchError

# Class: PublicStatesEraMismatchError

An error indicating that the read surface served the ledger parameters or the zswap chain state of
a contract written by another ledger era than the one the call is built on, or did not serve them.
One read carries the states of one era, so the states cannot be combined into a call.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

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

`"v8"` \| `"v9"`

The ledger era the call is built on.

##### received

`"v8"` \| `"v9"` \| `undefined`

The era of that state, or `undefined` when it was missing.

#### Returns

`PublicStatesEraMismatchError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_PUBLIC_STATES_ERA_MISMATCH"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

***

### expected

> `readonly` **expected**: `"v8"` \| `"v9"`

***

### field

> `readonly` **field**: `"ledgerParameters"` \| `"zswapChainState"`

***

### received

> `readonly` **received**: `"v8"` \| `"v9"` \| `undefined`
