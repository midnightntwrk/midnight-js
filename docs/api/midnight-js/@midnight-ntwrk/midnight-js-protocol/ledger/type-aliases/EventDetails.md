[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / EventDetails

# Type Alias: EventDetails

> **EventDetails** = \{ `contract`: [`ContractAddress`](ContractAddress.md) \| `undefined`; `nullifier`: [`Nullifier`](Nullifier.md); `tag`: `"zswapInput"`; \} \| \{ `commitment`: [`CoinCommitment`](CoinCommitment.md); `contract`: [`ContractAddress`](ContractAddress.md) \| `undefined`; `mtIndex`: `bigint`; `tag`: `"zswapOutput"`; \} \| \{ `blockTime`: `Date`; `generation`: [`DustGenerationInfo`](DustGenerationInfo.md); `generationIndex`: `bigint`; `tag`: `"dustInitialUtxo"`; \} \| \{ `blockTime`: `Date`; `tag`: `"dustGenerationDtimeUpdate"`; `update`: [`TreeInsertionPath`](TreeInsertionPath.md)\<[`DustGenerationInfo`](DustGenerationInfo.md)\>; \} \| \{ `blockTime`: `Date`; `commitment`: [`DustCommitment`](DustCommitment.md); `commitmentIndex`: `bigint`; `declaredTime`: `Date`; `nullifier`: [`DustNullifier`](DustNullifier.md); `tag`: `"dustSpendProcessed"`; `vFee`: `bigint`; \} \| \{ `address`: [`ContractAddress`](ContractAddress.md); `entryPoint`: `Uint8Array` \| `string`; `loggedItem`: \{ `data`: [`EncodedStateValue`](EncodedStateValue.md); `eventType`: [`LogEventType`](LogEventType.md); `version`: `number`; \}; `tag`: `"contractLog"`; \} \| \{ `tag`: `string`; \}

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1411

Details of the event emitted
