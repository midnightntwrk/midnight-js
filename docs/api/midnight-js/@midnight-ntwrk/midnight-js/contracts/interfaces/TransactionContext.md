[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / TransactionContext

# Interface: TransactionContext\<C, PCK\>

Defined in: packages/contracts/dist/index.d.ts:709

Encapsulates the context for managing a scoped contract transaction.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\> = [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### \[CacheStates\]

> `readonly` **\[CacheStates\]**: (`states`, `identity`, `blockHash`) => `void`

Defined in: packages/contracts/dist/index.d.ts:713

#### Parameters

##### states

[`PublicContractStates`](PublicContractStates.md) \| [`ContractStates`](ContractStates.md)\<[`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\>

##### identity

`CachedStateIdentity`

##### blockHash

`string`

#### Returns

`void`

***

### \[GetCurrentStatesForIdentity\]

> `readonly` **\[GetCurrentStatesForIdentity\]**: (`identity`) => `PinnedContractStates`\<[`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> \| `undefined`

Defined in: packages/contracts/dist/index.d.ts:714

#### Parameters

##### identity

`CachedStateIdentity`

#### Returns

`PinnedContractStates`\<[`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> \| `undefined`

***

### \[MergeUnsubmittedCallTxData\]

> `readonly` **\[MergeUnsubmittedCallTxData\]**: (`circuitId`, `callData`, `privateStateId?`) => `void`

Defined in: packages/contracts/dist/index.d.ts:712

#### Parameters

##### circuitId

`PCK`

##### callData

[`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)\<`C`, `PCK`\>

##### privateStateId?

`string`

#### Returns

`void`

***

### \[Submit\]

> `readonly` **\[Submit\]**: () => `Promise`\<[`FinalizedCallTxData`](FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Defined in: packages/contracts/dist/index.d.ts:711

#### Returns

`Promise`\<[`FinalizedCallTxData`](FinalizedCallTxData.md)\<`C`, `PCK`\>\>

***

### \[TypeId\]

> `readonly` **\[TypeId\]**: *typeof* `TypeId`

Defined in: packages/contracts/dist/index.d.ts:710

## Methods

### getAdditionalMappings()

> **getAdditionalMappings**(): `ReadonlyMap`\<`string`, `string`\> \| `undefined`

Defined in: packages/contracts/dist/index.d.ts:721

Gets the additional scoped [CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger) to [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger) mappings.

#### Returns

`ReadonlyMap`\<`string`, `string`\> \| `undefined`

A `ReadonlyMap`<[CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger), [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger)> instance, or `undefined` if no additional
mappings were specified for the current transaction context.

***

### getCurrentStates()

> **getCurrentStates**(): [`PublicContractStates`](PublicContractStates.md) \| [`ContractStates`](ContractStates.md)\<[`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> \| `undefined`

Defined in: packages/contracts/dist/index.d.ts:731

Gets the current cached contract states within the transaction context.

#### Returns

[`PublicContractStates`](PublicContractStates.md) \| [`ContractStates`](ContractStates.md)\<[`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> \| `undefined`

A cached [ContractStates](ContractStates.md) instance, or `undefined` if circuit calls are yet to be made.

#### Remarks

The returned states represent the unsubmitted _running_ state of the contract within the transaction context,
reflecting any unsubmitted circuit calls made to the contract during the scope of the transaction.

***

### getLastUnsubmittedCallTxDataToTransact()

> **getLastUnsubmittedCallTxDataToTransact**(): \[[`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)\<`C`, `PCK`\>, `string`?\] \| `undefined`

Defined in: packages/contracts/dist/index.d.ts:738

Gets the last unsubmitted call transaction data.

#### Returns

\[[`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)\<`C`, `PCK`\>, `string`?\] \| `undefined`

A tuple containing an [UnsubmittedCallTxData](UnsubmittedCallTxData.md) instance, and an optional private state
ID, or `undefined` if circuit calls are yet to be made.
