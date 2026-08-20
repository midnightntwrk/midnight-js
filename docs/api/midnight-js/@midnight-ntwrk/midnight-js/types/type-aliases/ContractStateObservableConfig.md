[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ContractStateObservableConfig

# Type Alias: ContractStateObservableConfig

> **ContractStateObservableConfig** = [`TxIdConfig`](TxIdConfig.md) \| [`BlockHashConfig`](BlockHashConfig.md) \| [`BlockHeightConfig`](BlockHeightConfig.md) & `object` \| [`Latest`](Latest.md) \| [`All`](All.md)

Defined in: packages/types/dist/index.d.ts:921

The configuration for a contract state observable. The corresponding observables may begin at different
places (e.g. after a specific transaction identifier / block height) depending on the configuration, but
all state updates after the beginning are always included.
