[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ContractEventFilterBase

# Interface: ContractEventFilterBase

Filter fields shared by the query and the subscription.

## Extended by

- [`ContractEventQueryFilter`](ContractEventQueryFilter.md)
- [`ContractEventSubscriptionFilter`](ContractEventSubscriptionFilter.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

Required: the contract whose events to return.

***

### fieldPrefixes?

> `readonly` `optional` **fieldPrefixes?**: [`ContractEventFieldPrefix`](ContractEventFieldPrefix.md)[]

Optional prefix filters on indexed fields. Accepted only when every
filtered type is a standard (non-`Misc`) variant — see method docs.

***

### transactionHash?

> `readonly` `optional` **transactionHash?**: `string`

Optional: narrow to events emitted from the transaction with this chain hash.

***

### types?

> `readonly` `optional` **types?**: [`ContractEventType`](../type-aliases/ContractEventType.md)[]

Optional subset of event types. Omit to mean "all types". An empty array
is rejected (it would silently match nothing).
