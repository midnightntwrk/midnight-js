[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / getStates

# Variable: getStates

> `const` **getStates**: \<`PS`\>(`publicDataProvider`, `privateStateProvider`, `contractAddress`, `privateStateId`, `blockHash?`) => `Promise`\<[`ContractStates`](../interfaces/ContractStates.md)\<`PS`\>\>

Defined in: packages/contracts/dist/index.d.ts:369

Retrieves the Zswap, ledger, and private states of the contract corresponding
to the given identifier using the given providers.

## Type Parameters

### PS

`PS`

## Parameters

### publicDataProvider

[`PublicDataProvider`](../../types/interfaces/PublicDataProvider.md)

The provider to use to fetch the public states (Zswap and ledger)
                          from the blockchain.

### privateStateProvider

[`PrivateStateProvider`](../../types/interfaces/PrivateStateProvider.md)\<[`PrivateStateId`](../../types/type-aliases/PrivateStateId.md), `PS`\>

The provider to use to fetch the private state.

### contractAddress

[`ContractAddress`](../../../midnight-js-protocol/ledger/type-aliases/ContractAddress.md)

The ledger address of the contract.

### privateStateId

[`PrivateStateId`](../../types/type-aliases/PrivateStateId.md)

The identifier for the private state of the contract.

### blockHash?

`string`

## Returns

`Promise`\<[`ContractStates`](../interfaces/ContractStates.md)\<`PS`\>\>
