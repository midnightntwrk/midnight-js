[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / getPublicStates

# Variable: getPublicStates

> `const` **getPublicStates**: (`publicDataProvider`, `contractAddress`, `blockHash?`) => `Promise`\<[`PublicStatesRead`](../../types/interfaces/PublicStatesRead.md)\>

Fetches only the public visible (Zswap and ledger) states of a contract, as bytes with the
era of the ledger that wrote them.

## Parameters

### publicDataProvider

[`PublicDataProvider`](../../types/interfaces/PublicDataProvider.md)

The provider to use to fetch the public states (Zswap and ledger)
                          from the blockchain.

### contractAddress

[`ContractAddress$1`](https://github.com/midnightntwrk/midnight-ledger)

The ledger address of the contract.

### blockHash?

`string`

The block to read the states at. If `undefined`, the latest states are read.

## Returns

`Promise`\<[`PublicStatesRead`](../../types/interfaces/PublicStatesRead.md)\>
