[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / NetworkVersionStateMismatchError

# Class: NetworkVersionStateMismatchError

An error indicating that the ledger version this operation read from the network is a different ledger era from
the one the contract state it fetched was written by, and that a fresh read of the network's ledger version
confirms the first reading was the stale half.

The two are read at separate moments, so during the fork window an operation can start from a
network version reading that is already behind the state it goes on to fetch.

The message deliberately does NOT claim which of the two readings moved: the check establishes
that they disagree and that a fresh read agrees with the state, never a direction. Do not add
one.

## See

[EraDispatch](../../documents/EraDispatch.md) for the five-step check that produces this error.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new NetworkVersionStateMismatchError**(`networkVersion`, `stateEra`): `NetworkVersionStateMismatchError`

#### Parameters

##### networkVersion

`"v8"` \| `"v9"`

The ledger version the network reported when the operation started.

##### stateEra

`"v8"` \| `"v9"`

The ledger era that wrote the fetched state.

#### Returns

`NetworkVersionStateMismatchError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_NETWORK_VERSION_STATE_MISMATCH"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### networkVersion

> `readonly` **networkVersion**: `"v8"` \| `"v9"`

***

### stateEra

> `readonly` **stateEra**: `"v8"` \| `"v9"`
