[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerPublicDataProvider

# Class: IndexerPublicDataProvider

Indexer-backed `PublicDataProvider`. Every method that takes a
`ContractAddress` validates the input up front via
`assertIsContractAddress`. The constructor shape `(handle, pollInterval)`
maps directly onto `Layer.scoped` in the future Effect migration (#843).

TODO: Re-examine caching when 'ContractCall' and 'ContractDeploy' have
transaction identifiers included.

## Implements

- [`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md)

## Constructors

### Constructor

> **new IndexerPublicDataProvider**(`handle`, `pollInterval`): `IndexerPublicDataProvider`

#### Parameters

##### handle

`ApolloHandle`

##### pollInterval

`number`

#### Returns

`IndexerPublicDataProvider`

## Methods

### contractEventsObservable()

> **contractEventsObservable**(`filter`, `opts?`): `Observable`\<[`ContractEvent`](../../../midnight-js/types/type-aliases/ContractEvent.md)\>

Streams contract events for `filter.contractAddress`, replaying from
`opts.startAt` then continuing live. Request building and validation are
delegated to buildSubscriptionVariables, which throws
**synchronously** on an invalid filter (mirroring the other observable
methods). See the [PublicDataProvider.contractEventsObservable](../../../midnight-js/types/interfaces/PublicDataProvider.md#contracteventsobservable)
contract for cursor, completion, and at-least-once semantics.

#### Parameters

##### filter

[`ContractEventSubscriptionFilter`](../../../midnight-js/types/interfaces/ContractEventSubscriptionFilter.md)

##### opts?

###### startAt?

[`ContractEventCursor`](../../../midnight-js/types/type-aliases/ContractEventCursor.md)

#### Returns

`Observable`\<[`ContractEvent`](../../../midnight-js/types/type-aliases/ContractEvent.md)\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`contractEventsObservable`](../../../midnight-js/types/interfaces/PublicDataProvider.md#contracteventsobservable)

***

### contractStateObservable()

> **contractStateObservable**(`contractAddress`, `config?`): `Observable`\<[`PositionedRecord`](../../../midnight-js/types/type-aliases/PositionedRecord.md)\<[`ContractStateRead`](../../../midnight-js/types/interfaces/ContractStateRead.md)\>\>

Creates a stream of contract states for `contractAddress`.

Each state arrives as bytes with the era of the ledger that wrote it.
A v8 state does not end the stream, so a stream started before the ledger
fork keeps going across it. A record carries no ledger parameters: the
subscription does not ask for them, which would cost one blob per contract
action.

Every branch reads the indexer's feed of this contract's actions, filtered
by address on the server. A transport reconnect makes the indexer replay
from the subscription's original offset; every branch suppresses what it
has already delivered, and `inclusive: false` keeps holding.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`ContractStateObservableConfig`](../../../midnight-js/types/type-aliases/ContractStateObservableConfig.md) = `DEFAULT_STATE_CONFIG`

The configuration of the stream. Defaults to `latest`.

#### Returns

`Observable`\<[`PositionedRecord`](../../../midnight-js/types/type-aliases/PositionedRecord.md)\<[`ContractStateRead`](../../../midnight-js/types/interfaces/ContractStateRead.md)\>\>

#### See

[SubscriptionShapes](../../documents/SubscriptionShapes.md) for how each branch starts and how replays
  are suppressed.

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`contractStateObservable`](../../../midnight-js/types/interfaces/PublicDataProvider.md#contractstateobservable)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Releases the WebSocket connection and Apollo state. Delegates to
ApolloHandle.dispose — see its docs for the
repeat/concurrent/rejection-replay semantics.

#### Returns

`Promise`\<`void`\>

***

### queryBlock()

> **queryBlock**(`config?`): `Promise`\<[`BlockInfo`](../../../midnight-js/types/type-aliases/BlockInfo.md) \| `null`\>

Retrieves a block. If no block hash or block height is provided, the latest block is returned.
Immediately returns null if no matching block is found.

#### Parameters

##### config?

[`BlockHeightConfig`](../../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../../midnight-js/types/type-aliases/BlockHashConfig.md)

The configuration of the query identifying the block of interest.
              If `undefined` returns the latest block.

#### Returns

`Promise`\<[`BlockInfo`](../../../midnight-js/types/type-aliases/BlockInfo.md) \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryBlock`](../../../midnight-js/types/interfaces/PublicDataProvider.md#queryblock)

***

### queryContractEvents()

> **queryContractEvents**(`filter`, `page?`): `Promise`\<[`ContractEvent`](../../../midnight-js/types/type-aliases/ContractEvent.md)[]\>

Queries contract events for `filter.contractAddress`. Request building and
validation are delegated to buildQueryVariables, which throws
**synchronously** (before any network call) on an invalid address, empty
`types`, illegal `fieldPrefixes`, or an unknown `fieldName`. When
`page.limit` is omitted [DEFAULT\_CONTRACT\_EVENTS\_PAGE\_SIZE](../variables/DEFAULT_CONTRACT_EVENTS_PAGE_SIZE.md) is applied.

Results are mapped in the indexer's ascending-`id` order. GraphQL /
transport errors reject the promise via maybeThrowQueryError — an
empty array always means "no matching events", never a swallowed error.

#### Parameters

##### filter

[`ContractEventQueryFilter`](../../../midnight-js/types/interfaces/ContractEventQueryFilter.md)

##### page?

[`ContractEventsPage`](../../../midnight-js/types/interfaces/ContractEventsPage.md)

#### Returns

`Promise`\<[`ContractEvent`](../../../midnight-js/types/type-aliases/ContractEvent.md)[]\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryContractEvents`](../../../midnight-js/types/interfaces/PublicDataProvider.md#querycontractevents)

***

### queryContractState()

> **queryContractState**(`address`, `config?`): `Promise`\<[`ContractStateAndParametersRead`](../../../midnight-js/types/interfaces/ContractStateAndParametersRead.md) \| `null`\>

Retrieves the on-chain state of a contract as bytes, with the ledger parameters of the block
that dates the read. If no block hash or block height are provided, the contract state at the
address in the latest block is returned. Decode the state with your own runtime:
`read.contractState.deserialize({ v9: ContractState })`.
Immediately returns null if no matching data is found.

#### Parameters

##### address

`string`

The address of the contract of interest.

##### config?

[`BlockHeightConfig`](../../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../../midnight-js/types/type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`ContractStateAndParametersRead`](../../../midnight-js/types/interfaces/ContractStateAndParametersRead.md) \| `null`\>

#### Throws

When the state or the ledger parameters are not well-formed bytes of a known era, when
the state is newer than the block a pinned read names, or when the ledger parameters are of
another era than their block.

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryContractState`](../../../midnight-js/types/interfaces/PublicDataProvider.md#querycontractstate)

***

### queryDeployContractState()

> **queryDeployContractState**(`contractAddress`): `Promise`\<[`ContractStateRead`](../../../midnight-js/types/interfaces/ContractStateRead.md) \| `null`\>

Reads the deploy's record, or the latest update's record when the contract
has been updated. The record keeps the encoding its block wrote: a v8-era
record comes back as its stored bytes, never translated to the v9 encoding.

#### Parameters

##### contractAddress

`string`

#### Returns

`Promise`\<[`ContractStateRead`](../../../midnight-js/types/interfaces/ContractStateRead.md) \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryDeployContractState`](../../../midnight-js/types/interfaces/PublicDataProvider.md#querydeploycontractstate)

***

### queryLatestProtocolVersion()

> **queryLatestProtocolVersion**(): `Promise`\<`number`\>

Reads the protocol-version integer of the network's latest block.

The indexer's `block` root field with no offset resolves to the latest
indexed block, so this is the latest version.

This implementation does not cache: every call issues a request. The
interface permits a cache bounded short of block time — see
`PublicDataProvider.queryLatestProtocolVersion` — but there is no measured
cost here to spend that budget on, and an expiring cache is not free to
get right. For the era of a state already read, use its
`contractState.era`, which costs no request at all.

#### Returns

`Promise`\<`number`\>

#### Throws

When the indexer has not indexed a block yet
  and therefore reports no latest block.

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryLatestProtocolVersion`](../../../midnight-js/types/interfaces/PublicDataProvider.md#querylatestprotocolversion)

***

### queryUnshieldedBalances()

> **queryUnshieldedBalances**(`address`, `config?`): `Promise`\<[`UnshieldedBalances`](../../../midnight-js/types/type-aliases/UnshieldedBalances.md) \| `null`\>

Retrieves the unshielded balances associated with a specific contract address.

#### Parameters

##### address

`string`

The address of the contract of interest.

##### config?

[`BlockHeightConfig`](../../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../../midnight-js/types/type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`UnshieldedBalances`](../../../midnight-js/types/type-aliases/UnshieldedBalances.md) \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryUnshieldedBalances`](../../../midnight-js/types/interfaces/PublicDataProvider.md#queryunshieldedbalances)

***

### queryZSwapAndContractState()

> **queryZSwapAndContractState**(`address`, `config?`): `Promise`\<[`PublicStatesRead`](../../../midnight-js/types/interfaces/PublicStatesRead.md) \| `null`\>

Retrieves the zswap chain state (token balances), the contract state of the contract at the
given address, and the ledger parameters in effect on the associated block, each as bytes with
the era of the ledger that wrote them. All three are written by the ledger of one era. On a read
with no block given, the contract state is looked up separately from the block, so near the hard
fork it can come from another block than the ledger parameters and the zswap chain state.
Immediately returns null if no matching data is found.

#### Parameters

##### address

`string`

The address of the contract of interest.

##### config?

[`BlockHeightConfig`](../../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../../midnight-js/types/type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`PublicStatesRead`](../../../midnight-js/types/interfaces/PublicStatesRead.md) \| `null`\>

#### Throws

When the contract state and the ledger parameters were written by different eras.

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryZSwapAndContractState`](../../../midnight-js/types/interfaces/PublicDataProvider.md#queryzswapandcontractstate)

***

### unshieldedBalancesObservable()

> **unshieldedBalancesObservable**(`contractAddress`, `config?`): `Observable`\<[`PositionedRecord`](../../../midnight-js/types/type-aliases/PositionedRecord.md)\<[`UnshieldedBalances`](../../../midnight-js/types/type-aliases/UnshieldedBalances.md)\>\>

Creates a stream of unshielded balances for `contractAddress`.

Reads the same feed of this contract's actions as
[contractStateObservable](#contractstateobservable), through `UNSHIELDED_BALANCE_SUB`, with the
same start rules and the same replay suppression.

The `txId` configuration is not supported and throws
[IndexerProviderConfigError](IndexerProviderConfigError.md); this provider offers no tx-anchored
balance stream.

See blockOffsetToUnshieldedBalances$ for the per-subscription doc.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`ContractStateObservableConfig`](../../../midnight-js/types/type-aliases/ContractStateObservableConfig.md) = `...`

The configuration of the stream. Defaults to `latest`.

#### Returns

`Observable`\<[`PositionedRecord`](../../../midnight-js/types/type-aliases/PositionedRecord.md)\<[`UnshieldedBalances`](../../../midnight-js/types/type-aliases/UnshieldedBalances.md)\>\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`unshieldedBalancesObservable`](../../../midnight-js/types/interfaces/PublicDataProvider.md#unshieldedbalancesobservable)

***

### watchForContractState()

> **watchForContractState**(`contractAddress`): `Promise`\<[`ContractStateRead`](../../../midnight-js/types/interfaces/ContractStateRead.md)\>

Retrieves the contract state of the contract with the given address, as bytes with the era
of the ledger that wrote them. Waits indefinitely for matching data to appear.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`ContractStateRead`](../../../midnight-js/types/interfaces/ContractStateRead.md)\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForContractState`](../../../midnight-js/types/interfaces/PublicDataProvider.md#watchforcontractstate)

***

### watchForDeployTxData()

> **watchForDeployTxData**(`contractAddress`): `Promise`\<[`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)\>

Not declared `async`, so an invalid address is refused synchronously. The
record itself is built after the poll resolves, because the era's runtime
may still have to be acquired.

#### Parameters

##### contractAddress

`string`

#### Returns

`Promise`\<[`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForDeployTxData`](../../../midnight-js/types/interfaces/PublicDataProvider.md#watchfordeploytxdata)

***

### watchForTxData()

> **watchForTxData**(`txId`): `Promise`\<[`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)\>

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

`Promise`\<[`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)\>

A promise that resolves with finalized transaction data when the transaction appears on-chain.
         The promise never rejects due to timeout.

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForTxData`](../../../midnight-js/types/interfaces/PublicDataProvider.md#watchfortxdata)

***

### watchForUnshieldedBalances()

> **watchForUnshieldedBalances**(`contractAddress`): `Promise`\<[`UnshieldedBalances`](../../../midnight-js/types/type-aliases/UnshieldedBalances.md)\>

Monitors for any unshielded balances associated with a specific contract address.

#### Parameters

##### contractAddress

`string`

The address of the contract to monitor for unshielded balances.

#### Returns

`Promise`\<[`UnshieldedBalances`](../../../midnight-js/types/type-aliases/UnshieldedBalances.md)\>

A promise that resolves to the detected unshielded balances.

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForUnshieldedBalances`](../../../midnight-js/types/interfaces/PublicDataProvider.md#watchforunshieldedbalances)
