[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / HeadStateEraMismatchError

# Class: HeadStateEraMismatchError

An error indicating that the network head this operation resolved is a different ledger era from
the one the contract state it fetched was written by, and that a fresh head read confirms the
head reading was the stale half.

The two are read at separate moments, so during the fork window an operation can start from a
head reading that is already behind the state it goes on to fetch.

The message deliberately does NOT claim which of the two readings moved: the check establishes
that they disagree and that a fresh read agrees with the state, never a direction. Do not add
one.

## See

[EraDispatch](../../documents/EraDispatch.md) for the five-step check that produces this error.

## Extends

- `Error`

## Constructors

### Constructor

> **new HeadStateEraMismatchError**(`head`, `stateEra`): `HeadStateEraMismatchError`

#### Parameters

##### head

`"v8"` \| `"v9"`

The era the operation resolved from the network head.

##### stateEra

`"v8"` \| `"v9"`

The era the fetched state's own envelope was written by.

#### Returns

`HeadStateEraMismatchError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH"`

***

### head

> `readonly` **head**: `"v8"` \| `"v9"`

***

### stateEra

> `readonly` **stateEra**: `"v8"` \| `"v9"`
