[**Midnight.js API Reference v3.0.0**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / getUnshieldedBalances

# Function: getUnshieldedBalances()

> **getUnshieldedBalances**(`publicDataProvider`, `contractAddress`): `Promise`\<[`UnshieldedBalances`](../../midnight-js-types/type-aliases/UnshieldedBalances.md)\>

Fetches the unshielded balances associated with a specific contract address.

## Parameters

### publicDataProvider

[`PublicDataProvider`](../../midnight-js-types/interfaces/PublicDataProvider.md)

The provider to use to fetch the unshielded balances from the blockchain.

### contractAddress

`string`

The ledger address of the contract.

## Returns

`Promise`\<[`UnshieldedBalances`](../../midnight-js-types/type-aliases/UnshieldedBalances.md)\>
