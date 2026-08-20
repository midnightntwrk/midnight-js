[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../../../README.md) / [compact-js/effect](../../../../../README.md) / [ZKConfiguration](../../../README.md) / [ZKConfiguration](../README.md) / Service

# Interface: Service

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKConfiguration.d.ts:17

Provides utilities for working with the ZK assets of a compiled Compact contract.

## Properties

### createReader

> `readonly` **createReader**: \<`C`, `PS`\>(`compiledContract`) => `Effect`\<[`Reader`](Reader.md)\<`C`, `PS`\>\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKConfiguration.d.ts:24

Creates a ZK asset reader for a given compiled Compact contract.

#### Type Parameters

##### C

`C` *extends* [`Contract`](../../../../../../interfaces/Contract.md)\<`PS`, [`Witnesses`](../../../../../../type-aliases/Witnesses.md)\<`PS`\>\>

##### PS

`PS`

#### Parameters

##### compiledContract

[`CompiledContract`](../../../../../../namespaces/CompiledContract/interfaces/CompiledContract.md)\<`C`, `PS`, `never`\>

The Compact compiled contract.

#### Returns

`Effect`\<[`Reader`](Reader.md)\<`C`, `PS`\>\>

An `Effect` that yields a [Reader](Reader.md).
