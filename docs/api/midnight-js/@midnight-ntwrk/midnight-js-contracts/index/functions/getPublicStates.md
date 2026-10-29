[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / getPublicStates

# Function: getPublicStates()

> **getPublicStates**(`publicDataProvider`, `contractAddress`, `blockHash?`): `Promise`\<[`VersionedPublicStates`](../../../midnight-js/types/type-aliases/VersionedPublicStates.md)\>

Fetches only the public visible (Zswap and ledger) states of a contract, tagged with the ledger
era that wrote them. Narrow on `version`, or use `requireLedger9` from
`@midnight-ntwrk/midnight-js-utils` when only the v9 era is handled.

## Parameters

### publicDataProvider

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md)

The provider to use to fetch the public states (Zswap and ledger)
                          from the blockchain.

### contractAddress

`string`

The ledger address of the contract.

### blockHash?

`string`

The block to read the states at. If `undefined`, the latest states are read.

## Returns

`Promise`\<[`VersionedPublicStates`](../../../midnight-js/types/type-aliases/VersionedPublicStates.md)\>
