[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / PublicDataProvider

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

> **contractStateObservable**(`address`, `config`): `Observable`\<[`PositionedRecord`](../type-aliases/PositionedRecord.md)\<[`VersionedContractState`](../type-aliases/VersionedContractState.md)\>\>

Creates a stream of contract states, each tagged with the ledger era that wrote it. The
observable emits a value every time a state is either created or updated at the given address.
A replay that starts before the hard fork emits the pre-fork states as v8 values and carries on.
Waits indefinitely for matching data to appear.

#### Parameters

##### address

`string`

The address of the contract of interest.

##### config

[`ContractStateObservableConfig`](../type-aliases/ContractStateObservableConfig.md)

The configuration for the observable.

#### Returns

`Observable`\<[`PositionedRecord`](../type-aliases/PositionedRecord.md)\<[`VersionedContractState`](../type-aliases/VersionedContractState.md)\>\>

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

[`BlockHeightConfig`](../type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../type-aliases/BlockHashConfig.md)

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

> **queryContractState**(`contractAddress`, `config?`): `Promise`\<[`VersionedContractState`](../type-aliases/VersionedContractState.md) \| `null`\>

Retrieves the on-chain state of a contract, tagged with the ledger era that wrote it. If no
block hash or block height are provided, the contract state at the address in the latest block
is returned. A v8-era state is returned as the stored bytes, never translated to the v9 encoding.
Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`BlockHeightConfig`](../type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`VersionedContractState`](../type-aliases/VersionedContractState.md) \| `null`\>

***

### queryDeployContractState()

> **queryDeployContractState**(`contractAddress`): `Promise`\<[`VersionedContractState`](../type-aliases/VersionedContractState.md) \| `null`\>

Retrieves the contract state in the deploy's record for the contract at the given contract address,
or in the latest update's record when the contract has been updated, tagged with the ledger era
that wrote it. A v8-era record is returned as the stored bytes, never translated to the v9 encoding.
Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`VersionedContractState`](../type-aliases/VersionedContractState.md) \| `null`\>

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
era that wrote the bytes is the record's `version`. Reach for this method only where there is no
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

[ReadingTheNetworkLedgerVersion](../../documents/ReadingTheNetworkLedgerVersion.md) for why the cache must expire by itself, and
  why this member takes no "give me a fresh one" option.

***

### queryRawContractState()

> **queryRawContractState**(`contractAddress`, `config?`): `Promise`\<[`RawContractState`](RawContractState.md) \| `null`\>

Retrieves the on-chain state of a contract as the raw serialized bytes the
network returned, without deserializing them, tagged with the ledger era
that wrote them.

For callers that decode the bytes themselves: they narrow on
[RawContractState.version](RawContractState.md#version) and then hand the bytes to that era's
deserializer. Both eras' bytes are returned unchanged. The era is read
off the version tag the bytes carry.

Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`BlockHeightConfig`](../type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest state.

#### Returns

`Promise`\<[`RawContractState`](RawContractState.md) \| `null`\>

***

### queryUnshieldedBalances()

> **queryUnshieldedBalances**(`contractAddress`, `config?`): `Promise`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md) \| `null`\>

Retrieves the unshielded balances associated with a specific contract address.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`BlockHeightConfig`](../type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`UnshieldedBalances`](../type-aliases/UnshieldedBalances.md) \| `null`\>

***

### queryZSwapAndContractState()

> **queryZSwapAndContractState**(`contractAddress`, `config?`): `Promise`\<[`VersionedPublicStates`](../type-aliases/VersionedPublicStates.md) \| `null`\>

Retrieves the zswap chain state (token balances), the contract state of the contract at the
given address, and the ledger parameters in effect on the associated block, tagged with the
ledger era that wrote them. All three are retrieved in a single query to ensure consistency.
Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`BlockHeightConfig`](../type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`VersionedPublicStates`](../type-aliases/VersionedPublicStates.md) \| `null`\>

#### Throws

When the contract state and the ledger parameters were written by different eras.

***

### rawContractStateObservable()

> **rawContractStateObservable**(`address`, `config`): `Observable`\<[`PositionedRecord`](../type-aliases/PositionedRecord.md)\<[`RawContractState`](RawContractState.md)\>\>

Creates a stream of contract states as the raw serialized bytes the network
returned, without deserializing them, each tagged with the ledger era that
wrote it. The observable emits a value every time a state is either
created or updated at the given address.
Waits indefinitely for matching data to appear.

THE STREAMING COUNTERPART OF [queryRawContractState](#queryrawcontractstate). Prefer it over
[contractStateObservable](#contractstateobservable) when the caller decodes the bytes itself.

[RawContractState.version](RawContractState.md#version) is the era read off the version tag of
[RawContractState.raw](RawContractState.md#raw); [RawContractState.protocolVersion](RawContractState.md#protocolversion)
dates the block that served it.

[RawContractState.ledgerParameters](RawContractState.md#ledgerparameters) MAY BE ABSENT ON A STREAM even
where the same implementation serves it on
[queryRawContractState](#queryrawcontractstate). The parameters are a per-block blob, and a
stream may have no cheap way to obtain one per emission; an implementation
is free to refuse that cost. A caller that needs the parameters for a
streamed state reads [queryRawContractState](#queryrawcontractstate) with
`{ type: 'blockHash', blockHash }` from the same [PositionedRecord](../type-aliases/PositionedRecord.md).

#### Parameters

##### address

`string`

The address of the contract of interest.

##### config

[`ContractStateObservableConfig`](../type-aliases/ContractStateObservableConfig.md)

The configuration for the observable.

#### Returns

`Observable`\<[`PositionedRecord`](../type-aliases/PositionedRecord.md)\<[`RawContractState`](RawContractState.md)\>\>

One [PositionedRecord](../type-aliases/PositionedRecord.md) per value, carrying the block that
  served it. Passing its `blockHeight` or `blockHash` back as the config
  resumes the stream from that block; values from that block may be
  delivered again.

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

> **watchForContractState**(`contractAddress`): `Promise`\<[`VersionedContractState`](../type-aliases/VersionedContractState.md)\>

Retrieves the contract state of the contract with the given address, tagged with the ledger era
that wrote it. Waits indefinitely for matching data to appear.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`VersionedContractState`](../type-aliases/VersionedContractState.md)\>

***

### watchForDeployTxData()

> **watchForDeployTxData**(`contractAddress`): `Promise`\<[`VersionedFinalizedTxData`](../type-aliases/VersionedFinalizedTxData.md)\>

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

`Promise`\<[`VersionedFinalizedTxData`](../type-aliases/VersionedFinalizedTxData.md)\>

A promise that resolves with finalized transaction data when the deployment appears on-chain.
         The promise never rejects due to timeout.

***

### watchForTxData()

> **watchForTxData**(`txId`): `Promise`\<[`VersionedFinalizedTxData`](../type-aliases/VersionedFinalizedTxData.md)\>

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

`Promise`\<[`VersionedFinalizedTxData`](../type-aliases/VersionedFinalizedTxData.md)\>

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
