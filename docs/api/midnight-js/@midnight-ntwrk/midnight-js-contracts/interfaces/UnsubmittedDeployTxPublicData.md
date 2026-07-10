[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / UnsubmittedDeployTxPublicData

# Interface: UnsubmittedDeployTxPublicData

Base type for public data relevant to an unsubmitted deployment transaction.

## Extended by

- [`FinalizedDeployTxPublicData`](FinalizedDeployTxPublicData.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

The ledger address of the contract that was deployed.

***

### initialContractState

> `readonly` **initialContractState**: `ContractState`

The initial public state of the contract deployed to the blockchain.
