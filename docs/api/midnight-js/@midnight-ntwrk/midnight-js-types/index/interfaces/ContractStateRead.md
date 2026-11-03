[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ContractStateRead

# Interface: ContractStateRead

A contract state read from the network, as bytes.

Decode it with your own runtime, so the object is one your compiled contract accepts:

```ts
import { ContractState } from '@midnight-ntwrk/compact-runtime';

const read = await publicDataProvider.queryContractState(address);
if (read !== null) {
  const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
}
```

## Extended by

- [`ContractStateAndParametersRead`](ContractStateAndParametersRead.md)

## Properties

### contractState

> `readonly` **contractState**: [`SerializedState`](../classes/SerializedState.md)\<`"ContractState"`\>

The contract state.

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol-version integer of the block that dates the read. A state keeps the era of the
ledger that wrote it, so the era of this block can be newer than `contractState.era`. On a read
with no block given, the block and the state are looked up separately, so near the hard fork the
era of this block can also be older than `contractState.era`.
