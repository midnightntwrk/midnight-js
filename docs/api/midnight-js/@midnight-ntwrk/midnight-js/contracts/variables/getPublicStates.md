[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / getPublicStates

# Variable: getPublicStates

> `const` **getPublicStates**: (`publicDataProvider`, `contractAddress`, `blockHash?`) => `Promise`\<[`PublicContractStates`](../interfaces/PublicContractStates.md)\>

Defined in: packages/contracts/dist/index.d.ts:358

Fetches only the public visible (Zswap and ledger) states of a contract.

## Parameters

### publicDataProvider

[`PublicDataProvider`](../../types/interfaces/PublicDataProvider.md)

The provider to use to fetch the public states (Zswap and ledger)
                          from the blockchain.

### contractAddress

[`ContractAddress`](../../../midnight-js-protocol/ledger/type-aliases/ContractAddress.md)

The ledger address of the contract.

### blockHash?

`string`

## Returns

`Promise`\<[`PublicContractStates`](../interfaces/PublicContractStates.md)\>
