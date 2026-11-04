[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9UnsubmittedDeployTxPublicData

# Interface: Ledger9UnsubmittedDeployTxPublicData

Base type for public data relevant to an unsubmitted deployment transaction.

## Extended by

- [`Ledger9FinalizedDeployTxPublicData`](Ledger9FinalizedDeployTxPublicData.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

The ledger address of the contract that was deployed.

***

### initialContractState

> `readonly` **initialContractState**: [`SerializedContractState`](../../types/classes/SerializedContractState.md)\<`"v9"`\>

The initial public state of the contract deployed to the blockchain, as bytes. Decode it with
your own runtime: `initialContractState.deserialize({ v9: ContractState })`.
