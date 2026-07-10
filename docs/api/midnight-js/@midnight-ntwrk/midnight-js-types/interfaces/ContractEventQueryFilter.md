[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ContractEventQueryFilter

# Interface: ContractEventQueryFilter

Filter for [PublicDataProvider.queryContractEvents](PublicDataProvider.md#querycontractevents). `fromBlock` /
`toBlock` are inclusive block-height bounds for a finite, point-in-time read.

## Extends

- [`ContractEventFilterBase`](ContractEventFilterBase.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

Required: the contract whose events to return.

#### Inherited from

[`ContractEventFilterBase`](ContractEventFilterBase.md).[`contractAddress`](ContractEventFilterBase.md#contractaddress)

***

### fieldPrefixes?

> `readonly` `optional` **fieldPrefixes?**: [`ContractEventFieldPrefix`](ContractEventFieldPrefix.md)[]

Optional prefix filters on indexed fields. Accepted only when every
filtered type is a standard (non-`Misc`) variant — see method docs.

#### Inherited from

[`ContractEventFilterBase`](ContractEventFilterBase.md).[`fieldPrefixes`](ContractEventFilterBase.md#fieldprefixes)

***

### fromBlock?

> `readonly` `optional` **fromBlock?**: `number`

***

### toBlock?

> `readonly` `optional` **toBlock?**: `number`

***

### transactionHash?

> `readonly` `optional` **transactionHash?**: `string`

Optional: narrow to events emitted from the transaction with this chain hash.

#### Inherited from

[`ContractEventFilterBase`](ContractEventFilterBase.md).[`transactionHash`](ContractEventFilterBase.md#transactionhash)

***

### types?

> `readonly` `optional` **types?**: [`ContractEventType`](../type-aliases/ContractEventType.md)[]

Optional subset of event types. Omit to mean "all types". An empty array
is rejected (it would silently match nothing).

#### Inherited from

[`ContractEventFilterBase`](ContractEventFilterBase.md).[`types`](ContractEventFilterBase.md#types)
