[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ContractEventFilterBase

# Interface: ContractEventFilterBase

Defined in: packages/types/dist/index.d.ts:1052

Filter fields shared by the query and the subscription.

## Extended by

- [`ContractEventQueryFilter`](ContractEventQueryFilter.md)
- [`ContractEventSubscriptionFilter`](ContractEventSubscriptionFilter.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

Defined in: packages/types/dist/index.d.ts:1054

Required: the contract whose events to return.

***

### fieldPrefixes?

> `readonly` `optional` **fieldPrefixes?**: [`ContractEventFieldPrefix`](ContractEventFieldPrefix.md)[]

Defined in: packages/types/dist/index.d.ts:1064

Optional prefix filters on indexed fields. Accepted only when every
filtered type is a standard (non-`Misc`) variant — see method docs.

***

### transactionHash?

> `readonly` `optional` **transactionHash?**: `string`

Defined in: packages/types/dist/index.d.ts:1066

Optional: narrow to events emitted from the transaction with this chain hash.

***

### types?

> `readonly` `optional` **types?**: [`ContractEventType`](../type-aliases/ContractEventType.md)[]

Defined in: packages/types/dist/index.d.ts:1059

Optional subset of event types. Omit to mean "all types". An empty array
is rejected (it would silently match nothing).
