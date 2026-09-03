[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / getUnshieldedBalances

# Variable: getUnshieldedBalances

> `const` **getUnshieldedBalances**: (`publicDataProvider`, `contractAddress`) => `Promise`\<[`UnshieldedBalances`](../../types/type-aliases/UnshieldedBalances.md)\>

Defined in: packages/contracts/dist/index.d.ts:1074

Fetches the unshielded balances associated with a specific contract address.

## Parameters

### publicDataProvider

[`PublicDataProvider`](../../types/interfaces/PublicDataProvider.md)

The provider to use to fetch the unshielded balances from the blockchain.

### contractAddress

[`ContractAddress`](../../../midnight-js-protocol/ledger/type-aliases/ContractAddress.md)

The ledger address of the contract.

## Returns

`Promise`\<[`UnshieldedBalances`](../../types/type-aliases/UnshieldedBalances.md)\>
