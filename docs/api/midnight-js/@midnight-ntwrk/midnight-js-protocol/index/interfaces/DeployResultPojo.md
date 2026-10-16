[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / DeployResultPojo

# Interface: DeployResultPojo

What a composed deploy hands back.

`contractAddress` cannot be recomputed from the state a caller passed in, so
it is handed back here rather than derived. `initialContractStateBytes` is the state that
address was derived from — what a caller stores and later hands to a call.

All three are plain data.

## See

 - [VerifierKeys](../../documents/VerifierKeys.md) for why the address cannot be recomputed.
 - [EraSeam](../../documents/EraSeam.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

***

### initialContractStateBytes

> `readonly` **initialContractStateBytes**: `Uint8Array`

***

### txBytes

> `readonly` **txBytes**: `Uint8Array`
