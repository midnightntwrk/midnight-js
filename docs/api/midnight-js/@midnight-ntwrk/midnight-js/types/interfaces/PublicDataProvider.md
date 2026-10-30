[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PublicDataProvider

# Interface: PublicDataProvider

Interface for a public data service. This service retrieves public data from the blockchain.
TODO: Add timeouts or retry limits to 'watchFor' queries.

## Methods

### contractEventsObservable()

> **contractEventsObservable**(`filter`, `opts?`): `Observable`\<[`ContractEvent`](../type-aliases/ContractEvent.md)\>

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

> **contractStateObservable**(`address`, `config`): `Observable`\<[`PositionedRecord`](../type-aliases/PositionedRecord.md)\<[`ContractStateRead`](ContractStateRead.md)\>\>

Creates a stream of contract states, each as bytes with the era of the ledger that wrote
them. The observable emits a value every time a state is either created or updated at the given
address. A replay that starts before the hard fork emits the pre-fork states with
`contractState.era === 'v8'` and carries on. A stream carries no ledger parameters: a caller that
needs them reads [queryContractState](#querycontractstate) with `{ type: 'blockHash', blockHash }` from the same
record.
Waits indefinitely for matching data to appear.

#### Parameters

##### address

`string`

The address of the contract of interest.

##### config

[`ContractStateObservableConfig`](../type-aliases/ContractStateObservableConfig.md)

The configuration for the observable.

#### Returns

`Observable`\<[`PositionedRecord`](../type-aliases/PositionedRecord.md)\<[`ContractStateRead`](ContractStateRead.md)\>\>

One [PositionedRecord](../type-aliases/PositionedRecord.md) per value, carrying the block that
  served it. Passing its `blockHeight` or `blockHash` back as the config
  resumes the stream from that block; values from that block may be
  delivered again.

***

### queryBlock()

> **queryBlock**(`config?`): `Promise`\<[`BlockInfo`](../type-aliases/BlockInfo.md) \| `null`\>

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

> **queryContractState**(`contractAddress`, `config?`): `Promise`\<[`ContractStateAndParametersRead`](ContractStateAndParametersRead.md) \| `null`\>

Retrieves the on-chain state of a contract as bytes, with the ledger parameters of the block
that dates the read. If no block hash or block height are provided, the contract state at the
address in the latest block is returned. Decode the state with your own runtime:
`read.contractState.deserialize({ v9: ContractState })`.
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

`Promise`\<[`ContractStateAndParametersRead`](ContractStateAndParametersRead.md) \| `null`\>

#### Throws

When the state or the ledger parameters are not well-formed bytes of a known era, when
the state is newer than the block a pinned read names, or when the ledger parameters are of
another era than their block.

***

### queryDeployContractState()

> **queryDeployContractState**(`contractAddress`): `Promise`\<[`ContractStateRead`](ContractStateRead.md) \| `null`\>

Retrieves the contract state in the deploy's record for the contract at the given contract address,
or in the latest update's record when the contract has been updated, as bytes with the era
of the ledger that wrote them.
Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`ContractStateRead`](ContractStateRead.md) \| `null`\>

***

### queryLatestProtocolVersion()

> **queryLatestProtocolVersion**(): `Promise`\<`number`\>

Retrieves the protocol-version integer reported by the network's current
latest block.

Implementations MAY serve this from a cache, on ONE condition: the cached
answer must expire by itself, on a bound short relative to block time. A
reading held indefinitely is forbidden.

PREFER THE `protocolVersion` ON A READ wherever the era of *existing* data
is the question — it dates the block the read resolved and costs no extra
request. For a contract state that block can be newer than the bytes; the
era that wrote the bytes is `contractState.era`. Reach for this method only where there is no
record to date: the deploy path.

The answer is a LOWER BOUND on the era of the block that will include a
transaction built from it, never a guarantee. A caller that must be certain
confirms afterwards, from the `protocolVersion` on the finalized record.

#### Returns

`Promise`\<`number`\>

#### Throws

Implementation-specific error when the network reports no latest
  block at all.

#### See

ReadingTheNetworkLedgerVersion for why the cache must expire by itself, and
  why this member takes no "give me a fresh one" option.

***

### queryUnshieldedBalances()

> **queryUnshieldedBalances**(`contractAddress`, `config?`): `Promise`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md) \| `null`\>

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

> **queryZSwapAndContractState**(`contractAddress`, `config?`): `Promise`\<[`PublicStatesRead`](PublicStatesRead.md) \| `null`\>

Retrieves the zswap chain state (token balances), the contract state of the contract at the
given address, and the ledger parameters in effect on the associated block, each as bytes with
the era of the ledger that wrote them. All three are written by the ledger of one era. On a read
with no block given, the contract state is looked up separately from the block, so near the hard
fork it can come from another block than the ledger parameters and the zswap chain state.
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

`Promise`\<[`PublicStatesRead`](PublicStatesRead.md) \| `null`\>

#### Throws

When the contract state and the ledger parameters were written by different eras.

***

### unshieldedBalancesObservable()

> **unshieldedBalancesObservable**(`address`, `config`): `Observable`\<[`PositionedRecord`](../type-aliases/PositionedRecord.md)\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md)\>\>

Retrieves an observable that tracks the unshielded balances for a specific contract address.

#### Parameters

##### address

`string`

The contract address for which unshielded balances are being observed.

##### config

[`ContractStateObservableConfig`](../type-aliases/ContractStateObservableConfig.md)

The configuration object for observing contract state changes.

#### Returns

`Observable`\<[`PositionedRecord`](../type-aliases/PositionedRecord.md)\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md)\>\>

One [PositionedRecord](../type-aliases/PositionedRecord.md) per balance change, carrying the block
  that served it. Passing its `blockHeight` or `blockHash` back as the
  config resumes the stream from that block; values from that block may be
  delivered again.

***

### watchForContractState()

> **watchForContractState**(`contractAddress`): `Promise`\<[`ContractStateRead`](ContractStateRead.md)\>

Retrieves the contract state of the contract with the given address, as bytes with the era
of the ledger that wrote them. Waits indefinitely for matching data to appear.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`ContractStateRead`](ContractStateRead.md)\>

***

### watchForDeployTxData()

> **watchForDeployTxData**(`contractAddress`): `Promise`\<[`FinalizedTxRead`](../type-aliases/FinalizedTxRead.md)\>

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

`Promise`\<[`FinalizedTxRead`](../type-aliases/FinalizedTxRead.md)\>

A promise that resolves with finalized transaction data when the deployment appears on-chain.
         The promise never rejects due to timeout.

***

### watchForTxData()

> **watchForTxData**(`txId`): `Promise`\<[`FinalizedTxRead`](../type-aliases/FinalizedTxRead.md)\>

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

`Promise`\<[`FinalizedTxRead`](../type-aliases/FinalizedTxRead.md)\>

A promise that resolves with finalized transaction data when the transaction appears on-chain.
         The promise never rejects due to timeout.

***

### watchForUnshieldedBalances()

> **watchForUnshieldedBalances**(`contractAddress`): `Promise`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md)\>

Monitors for any unshielded balances associated with a specific contract address.

#### Parameters

##### contractAddress

`string`

The address of the contract to monitor for unshielded balances.

#### Returns

`Promise`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md)\>

A promise that resolves to the detected unshielded balances.
