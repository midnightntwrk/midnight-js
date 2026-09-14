[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / DeployResultPojo

# Interface: DeployResultPojo

What a composed deploy hands back.

`contractAddress` cannot be recomputed from the state a caller passed in, so
it is handed back here rather than derived. `initialState` is the state that
address was derived from — what a caller stores and later hands to a call.

All three are plain data.

## See

 - [VerifierKeys](../../documents/VerifierKeys.md) for why the address cannot be recomputed.
 - [EraSeam](../../documents/EraSeam.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

***

### initialState

> `readonly` **initialState**: `Uint8Array`

***

### transaction

> `readonly` **transaction**: `Uint8Array`
