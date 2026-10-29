[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / TransactionContext

# Interface: TransactionContext\<C, PCK\>

Encapsulates the context for managing a scoped contract transaction.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\> = [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### \[CacheStates\]

> `readonly` **\[CacheStates\]**: (`states`, `read`, `identity`, `blockHash`) => `void`

#### Parameters

##### states

`Ledger9PublicStates` \| `Ledger9ContractStates`\<[`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\>

##### read

[`PublicStatesRead`](../../../midnight-js/types/interfaces/PublicStatesRead.md)

##### identity

`CachedStateIdentity`

##### blockHash

`string`

#### Returns

`void`

***

### \[GetCurrentStatesForIdentity\]

> `readonly` **\[GetCurrentStatesForIdentity\]**: (`identity`) => `PinnedContractStates`\<[`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> \| `undefined`

#### Parameters

##### identity

`CachedStateIdentity`

#### Returns

`PinnedContractStates`\<[`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> \| `undefined`

***

### \[MergeUnsubmittedCallTxData\]

> `readonly` **\[MergeUnsubmittedCallTxData\]**: (`circuitId`, `callData`, `privateStateId?`) => `void`

#### Parameters

##### circuitId

`PCK`

##### callData

[`Ledger9UnsubmittedCallTxData`](Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>

##### privateStateId?

`string`

#### Returns

`void`

***

### \[Submit\]

> `readonly` **\[Submit\]**: () => `Promise`\<[`Ledger9FinalizedCallTxData`](Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

#### Returns

`Promise`\<[`Ledger9FinalizedCallTxData`](Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

***

### \[TypeId\]

> `readonly` **\[TypeId\]**: *typeof* `TypeId`

## Methods

### getAdditionalMappings()

> **getAdditionalMappings**(): `ReadonlyMap`\<`string`, `string`\> \| `undefined`

Gets the additional scoped [CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger) to [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger) mappings.

#### Returns

`ReadonlyMap`\<`string`, `string`\> \| `undefined`

A `ReadonlyMap`<[CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger), [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger)> instance, or `undefined` if no additional
mappings were specified for the current transaction context.

***

### getCurrentStates()

> **getCurrentStates**(): [`PublicStatesRead`](../../../midnight-js/types/interfaces/PublicStatesRead.md) \| `undefined`

Gets the public states of the contract within the transaction context, as bytes. Decode them with
your own runtime, as with `getStates`: `states.contractState.deserialize({ v9: ContractState })`.

#### Returns

[`PublicStatesRead`](../../../midnight-js/types/interfaces/PublicStatesRead.md) \| `undefined`

The public states, or `undefined` if circuit calls are yet to be made.

#### Remarks

The contract state is the unsubmitted _running_ state of the contract within the transaction context,
reflecting any unsubmitted circuit calls made to the contract during the scope of the transaction. The
ledger parameters and the zswap chain state are those of the block the scope was first read at. The
running private state is `getLastUnsubmittedCallTxDataToTransact()?.[0].private.nextPrivateState`.

***

### getLastUnsubmittedCallTxDataToTransact()

> **getLastUnsubmittedCallTxDataToTransact**(): \[[`Ledger9UnsubmittedCallTxData`](Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>, `string`?\] \| `undefined`

Gets the last unsubmitted call transaction data.

#### Returns

\[[`Ledger9UnsubmittedCallTxData`](Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>, `string`?\] \| `undefined`

A tuple containing an [Ledger9UnsubmittedCallTxData](Ledger9UnsubmittedCallTxData.md) instance, and an optional private state
ID, or `undefined` if circuit calls are yet to be made.
