[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PrivateStateSerializationError

# Class: PrivateStateSerializationError

An error thrown when a private state holds something that cannot survive being
stored, raised by an implementation of [PrivateStateProvider.set](../interfaces/PrivateStateProvider.md#set) before
anything is written.

Private state must be plain data. The exact set of values a given implementation
stores faithfully depends on how it serializes, so that set is documented by the
implementation rather than here.

## Extends

- `Error`

## Constructors

### Constructor

> **new PrivateStateSerializationError**(`path`, `reason`, `privateStateId?`): `PrivateStateSerializationError`

#### Parameters

##### path

`string`

Where the offending value sits inside the private state, as a
            property path (`registry.findPathForLeaf`, `witnesses[1]`), or
            [PRIVATE\_STATE\_ROOT\_PATH](../variables/PRIVATE_STATE_ROOT_PATH.md) for the private state itself.

##### reason

[`PrivateStateSerializationFailure`](../type-aliases/PrivateStateSerializationFailure.md)

What storage would do to it.

##### privateStateId?

`string`

The state being written, when the caller knows it.

#### Returns

`PrivateStateSerializationError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PRIVATE_STATE_NOT_SERIALIZABLE"`

***

### path

> `readonly` **path**: `string`

***

### privateStateId?

> `readonly` `optional` **privateStateId?**: `string`

***

### reason

> `readonly` **reason**: [`PrivateStateSerializationFailure`](../type-aliases/PrivateStateSerializationFailure.md)
