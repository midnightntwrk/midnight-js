[**Midnight.js API Reference v4.1.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ContractEventsPage

# Interface: ContractEventsPage

Pagination window for [PublicDataProvider.queryContractEvents](PublicDataProvider.md#querycontractevents).
`offset` is only stable within a window with a fixed upper bound — pin
`toBlock` for multi-page reads.

## Properties

### limit?

> `readonly` `optional` **limit?**: `number`

***

### offset?

> `readonly` `optional` **offset?**: `number`
