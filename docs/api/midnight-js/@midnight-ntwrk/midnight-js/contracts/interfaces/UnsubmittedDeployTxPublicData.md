[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / UnsubmittedDeployTxPublicData

# Interface: UnsubmittedDeployTxPublicData

Defined in: packages/contracts/dist/index.d.ts:476

Base type for public data relevant to an unsubmitted deployment transaction.

## Extended by

- [`FinalizedDeployTxPublicData`](FinalizedDeployTxPublicData.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

Defined in: packages/contracts/dist/index.d.ts:480

The ledger address of the contract that was deployed.

***

### initialContractState

> `readonly` **initialContractState**: [`ContractState`](../../../midnight-js-protocol/onchain-runtime/classes/ContractState.md)

Defined in: packages/contracts/dist/index.d.ts:484

The initial public state of the contract deployed to the blockchain.
