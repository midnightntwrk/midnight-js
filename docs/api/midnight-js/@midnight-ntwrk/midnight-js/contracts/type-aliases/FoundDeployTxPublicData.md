[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FoundDeployTxPublicData

# Type Alias: FoundDeployTxPublicData

> **FoundDeployTxPublicData** = [`Ledger8FoundDeployTxPublicData`](../interfaces/Ledger8FoundDeployTxPublicData.md) \| [`Ledger9FinalizedDeployTxPublicData`](../interfaces/Ledger9FinalizedDeployTxPublicData.md)

The public data of a deployment found on chain, discriminated by the ledger
era that recorded the deploy transaction. Narrow on `era` before reading
`tx`. `contractAddress` and `initialContractState` are present on both
variants; the era of `initialContractState` is its own, read it from the state.
