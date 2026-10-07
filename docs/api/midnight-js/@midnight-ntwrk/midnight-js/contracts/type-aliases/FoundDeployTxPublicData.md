[**Midnight.js API Reference v5.0.0-rc.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FoundDeployTxPublicData

# Type Alias: FoundDeployTxPublicData

> **FoundDeployTxPublicData** = [`FoundDeployTxPublicDataV8`](../interfaces/FoundDeployTxPublicDataV8.md) \| [`FinalizedDeployTxPublicData`](../interfaces/FinalizedDeployTxPublicData.md)

The public data of a deployment found on chain, discriminated by the ledger
era that recorded the deploy transaction. Narrow on `version` before reading
`tx` or `initialContractState`; `contractAddress` is present on both arms.
