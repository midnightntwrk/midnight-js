[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ContractEventQueryFilter

# Interface: ContractEventQueryFilter

Defined in: packages/types/dist/index.d.ts:1072

Filter for [PublicDataProvider.queryContractEvents](PublicDataProvider.md#querycontractevents). `fromBlock` /
`toBlock` are inclusive block-height bounds for a finite, point-in-time read.

## Extends

- [`ContractEventFilterBase`](ContractEventFilterBase.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

Defined in: packages/types/dist/index.d.ts:1054

Required: the contract whose events to return.

#### Inherited from

[`ContractEventFilterBase`](ContractEventFilterBase.md).[`contractAddress`](ContractEventFilterBase.md#contractaddress)

***

### fieldPrefixes?

> `readonly` `optional` **fieldPrefixes?**: [`ContractEventFieldPrefix`](ContractEventFieldPrefix.md)[]

Defined in: packages/types/dist/index.d.ts:1064

Optional prefix filters on indexed fields. Accepted only when every
filtered type is a standard (non-`Misc`) variant — see method docs.

#### Inherited from

[`ContractEventFilterBase`](ContractEventFilterBase.md).[`fieldPrefixes`](ContractEventFilterBase.md#fieldprefixes)

***

### fromBlock?

> `readonly` `optional` **fromBlock?**: `number`

Defined in: packages/types/dist/index.d.ts:1073

***

### toBlock?

> `readonly` `optional` **toBlock?**: `number`

Defined in: packages/types/dist/index.d.ts:1074

***

### transactionHash?

> `readonly` `optional` **transactionHash?**: `string`

Defined in: packages/types/dist/index.d.ts:1066

Optional: narrow to events emitted from the transaction with this chain hash.

#### Inherited from

[`ContractEventFilterBase`](ContractEventFilterBase.md).[`transactionHash`](ContractEventFilterBase.md#transactionhash)

***

### types?

> `readonly` `optional` **types?**: [`ContractEventType`](../type-aliases/ContractEventType.md)[]

Defined in: packages/types/dist/index.d.ts:1059

Optional subset of event types. Omit to mean "all types". An empty array
is rejected (it would silently match nothing).

#### Inherited from

[`ContractEventFilterBase`](ContractEventFilterBase.md).[`types`](ContractEventFilterBase.md#types)
