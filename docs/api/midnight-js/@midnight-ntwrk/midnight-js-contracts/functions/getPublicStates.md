[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / getPublicStates

# Function: getPublicStates()

> **getPublicStates**(`publicDataProvider`, `contractAddress`, `blockHash?`): `Promise`\<[`PublicContractStates`](../interfaces/PublicContractStates.md)\>

Fetches only the public visible (Zswap and ledger) states of a contract.

## Parameters

### publicDataProvider

[`PublicDataProvider`](#)

The provider to use to fetch the public states (Zswap and ledger)
                          from the blockchain.

### contractAddress

`string`

The ledger address of the contract.

### blockHash?

`string`

## Returns

`Promise`\<[`PublicContractStates`](../interfaces/PublicContractStates.md)\>
