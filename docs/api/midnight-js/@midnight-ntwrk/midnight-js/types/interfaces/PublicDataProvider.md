[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PublicDataProvider

# Interface: PublicDataProvider

Defined in: packages/types/dist/index.d.ts:1106

Interface for a public data service. This service retrieves public data from the blockchain.
TODO: Add timeouts or retry limits to 'watchFor' queries.

## Methods

### contractEventsObservable()

> **contractEventsObservable**(`filter`, `opts?`): `Observable`\<[`ContractEvent`](../type-aliases/ContractEvent.md)\>

Defined in: packages/types/dist/index.d.ts:1257

Streams contract events for a contract address — replay from a cursor, then
live, in one continuous stream.

The start is supplied via `opts.startAt`: `{ fromId }` resumes inclusively
from a known event id, `{ fromBlock }` starts from a block height. Omitting
`startAt` streams from the start of history. The indexer replays historical
events from that point in monotonic `id` order, then continues live — there
is no separate backfill query and no client-side dedup.

`{ fromId }` is **inclusive**; to resume *after* the last seen event pass
`{ fromId: lastSeenId + 1 }`.

`filter.toBlock` completes the stream once the chain reaches that height;
without it the stream runs until unsubscribed or the provider is disposed.
Delivery is **at-least-once** across transport reconnects (the provider
does not advance the cursor) — persisting consumers should dedup by `id`.
Transport failures surface as an observable `error`, never a silent
completion.

#### Parameters

##### filter

[`ContractEventSubscriptionFilter`](ContractEventSubscriptionFilter.md)

The events to stream; `contractAddress` is required.

##### opts?

Optional stream start.

###### startAt?

[`ContractEventCursor`](../type-aliases/ContractEventCursor.md)

#### Returns

`Observable`\<[`ContractEvent`](../type-aliases/ContractEvent.md)\>

***

### contractStateObservable()

> **contractStateObservable**(`address`, `config`): `Observable`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>

Defined in: packages/types/dist/index.d.ts:1201

Creates a stream of contract states. The observable emits a value every time a state is either
created or updated at the given address.
Waits indefinitely for matching data to appear.

#### Parameters

##### address

`string`

The address of the contract of interest.

##### config

[`ContractStateObservableConfig`](../type-aliases/ContractStateObservableConfig.md)

The configuration for the observable.

#### Returns

`Observable`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>

***

### queryBlock()

> **queryBlock**(`config?`): `Promise`\<[`BlockInfo`](../type-aliases/BlockInfo.md) \| `null`\>

Defined in: packages/types/dist/index.d.ts:1113

Retrieves a block. If no block hash or block height is provided, the latest block is returned.
Immediately returns null if no matching block is found.

#### Parameters

##### config?

[`BlockHashConfig`](../type-aliases/BlockHashConfig.md) \| [`BlockHeightConfig`](../type-aliases/BlockHeightConfig.md)

The configuration of the query identifying the block of interest.
              If `undefined` returns the latest block.

#### Returns

`Promise`\<[`BlockInfo`](../type-aliases/BlockInfo.md) \| `null`\>

***

### queryContractEvents()

> **queryContractEvents**(`filter`, `page?`): `Promise`\<[`ContractEvent`](../type-aliases/ContractEvent.md)[]\>

Defined in: packages/types/dist/index.d.ts:1233

Queries contract events for a contract address — a finite, paginated,
point-in-time read.

Results are returned in ascending `id` order. The result is a plain array
with no total count: detect the end via `result.length < limit`, and read
`maxId` on the last item to see how far the tip is.

When `page.limit` is omitted an implementation-defined default page size is
applied (never an undocumented server default). `offset` is only stable
within a window with a fixed upper bound — pin `filter.toBlock` for
multi-page reads, or prefer the `getAllContractEvents` helper / the
subscription for tailing.

Fails fast (synchronously, before any network call) on an invalid
`contractAddress`, an empty `types` array, `fieldPrefixes` combined with
`Misc` (or with `types` omitted), or an unknown `fieldName`. Network /
GraphQL errors reject the promise — an empty array always means "no
matching events", never a swallowed error.

#### Parameters

##### filter

[`ContractEventQueryFilter`](ContractEventQueryFilter.md)

The events to return; `contractAddress` is required.

##### page?

[`ContractEventsPage`](ContractEventsPage.md)

Optional pagination window.

#### Returns

`Promise`\<[`ContractEvent`](../type-aliases/ContractEvent.md)[]\>

***

### queryContractState()

> **queryContractState**(`contractAddress`, `config?`): `Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

Defined in: packages/types/dist/index.d.ts:1122

Retrieves the on-chain state of a contract. If no block hash or block height are provided, the
contract state at the address in the latest block is returned.
Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`BlockHashConfig`](../type-aliases/BlockHashConfig.md) \| [`BlockHeightConfig`](../type-aliases/BlockHeightConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

***

### queryDeployContractState()

> **queryDeployContractState**(`contractAddress`): `Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

Defined in: packages/types/dist/index.d.ts:1138

Retrieves the contract state included in the deployment of the contract at the given contract address.
Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

***

### queryUnshieldedBalances()

> **queryUnshieldedBalances**(`contractAddress`, `config?`): `Promise`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md) \| `null`\>

Defined in: packages/types/dist/index.d.ts:1145

Retrieves the unshielded balances associated with a specific contract address.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`BlockHashConfig`](../type-aliases/BlockHashConfig.md) \| [`BlockHeightConfig`](../type-aliases/BlockHeightConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md) \| `null`\>

***

### queryZSwapAndContractState()

> **queryZSwapAndContractState**(`contractAddress`, `config?`): `Promise`\<\[[`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger), [`ContractState`](https://github.com/midnightntwrk/midnight-ledger), [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)\] \| `null`\>

Defined in: packages/types/dist/index.d.ts:1132

Retrieves the zswap chain state (token balances), the contract state of the contract at the
given address, and the ledger parameters in effect on the associated block. Both states are
retrieved in a single query to ensure consistency between the two.
Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`BlockHashConfig`](../type-aliases/BlockHashConfig.md) \| [`BlockHeightConfig`](../type-aliases/BlockHeightConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<\[[`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger), [`ContractState`](https://github.com/midnightntwrk/midnight-ledger), [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)\] \| `null`\>

***

### unshieldedBalancesObservable()

> **unshieldedBalancesObservable**(`address`, `config`): `Observable`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md)\>

Defined in: packages/types/dist/index.d.ts:1209

Retrieves an observable that tracks the unshielded balances for a specific contract address.

#### Parameters

##### address

`string`

The contract address for which unshielded balances are being observed.

##### config

[`ContractStateObservableConfig`](../type-aliases/ContractStateObservableConfig.md)

The configuration object for observing contract state changes.

#### Returns

`Observable`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md)\>

An observable that emits the unshielded balances for the provided address.

***

### watchForContractState()

> **watchForContractState**(`contractAddress`): `Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>

Defined in: packages/types/dist/index.d.ts:1151

Retrieves the contract state of the contract with the given address.
Waits indefinitely for matching data to appear.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>

***

### watchForDeployTxData()

> **watchForDeployTxData**(`contractAddress`): `Promise`\<[`FinalizedTxData`](FinalizedTxData.md)\>

Defined in: packages/types/dist/index.d.ts:1173

Retrieves data of the deployment transaction for the contract at the given contract address.

**IMPORTANT: This method waits indefinitely** until the deployment transaction appears on the
blockchain. It will never timeout or reject unless an error occurs.

Custom implementations MUST maintain this indefinite waiting behavior to ensure consistency
across all PublicDataProvider implementations. Do not implement timeouts in this method.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`FinalizedTxData`](FinalizedTxData.md)\>

A promise that resolves with finalized transaction data when the deployment appears on-chain.
         The promise never rejects due to timeout.

***

### watchForTxData()

> **watchForTxData**(`txId`): `Promise`\<[`FinalizedTxData`](FinalizedTxData.md)\>

Defined in: packages/types/dist/index.d.ts:1193

Retrieves data of the transaction containing the call or deployment with the given identifier.

**IMPORTANT: This method waits indefinitely** until the transaction appears on the blockchain.
It will never timeout or reject unless an error occurs.

Custom implementations MUST maintain this indefinite waiting behavior to ensure consistency
across all PublicDataProvider implementations. Do not implement timeouts in this method.

Applications using this method should be aware that:
- The promise will not resolve until the transaction appears on-chain
- If a transaction is invalid and never appears, this will never return
- Consider using application-level timeouts or cancellation mechanisms if needed

#### Parameters

##### txId

`string`

The identifier of the call or deployment of interest.

#### Returns

`Promise`\<[`FinalizedTxData`](FinalizedTxData.md)\>

A promise that resolves with finalized transaction data when the transaction appears on-chain.
         The promise never rejects due to timeout.

***

### watchForUnshieldedBalances()

> **watchForUnshieldedBalances**(`contractAddress`): `Promise`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md)\>

Defined in: packages/types/dist/index.d.ts:1158

Monitors for any unshielded balances associated with a specific contract address.

#### Parameters

##### contractAddress

`string`

The address of the contract to monitor for unshielded balances.

#### Returns

`Promise`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md)\>

A promise that resolves to the detected unshielded balances.
