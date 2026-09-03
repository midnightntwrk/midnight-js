[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ContractEventsPage

# Interface: ContractEventsPage

Defined in: packages/types/dist/index.d.ts:1098

Pagination window for [PublicDataProvider.queryContractEvents](PublicDataProvider.md#querycontractevents).
`offset` is only stable within a window with a fixed upper bound — pin
`toBlock` for multi-page reads.

## Properties

### limit?

> `readonly` `optional` **limit?**: `number`

Defined in: packages/types/dist/index.d.ts:1099

***

### offset?

> `readonly` `optional` **offset?**: `number`

Defined in: packages/types/dist/index.d.ts:1100
