[**Midnight.js API Reference v5.0.0-rc.3**](../../../../README.md)

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

> **contractStateObservable**(`contractAddress`, `config?`): `Observable`\<[`PositionedRecord`](../../../midnight-js/types/type-aliases/PositionedRecord.md)\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>\>

Creates a stream of contract states for `contractAddress`.

DECODES WITH THE CURRENT ERA'S RUNTIME ONLY, and the decode runs inside the
stream — so a state written by the retained runtime does not arrive as a
skipped emission, it ends the subscription through the subscriber's `error`
callback. A contract deployed before the ledger fork and not written to
since serves exactly such a state, indefinitely. Use
[rawContractStateObservable](#rawcontractstateobservable) where that is possible.

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

`Observable`\<[`PositionedRecord`](../../../midnight-js/types/type-aliases/PositionedRecord.md)\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>\>

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

> **queryContractState**(`address`, `config?`): `Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

Retrieves the on-chain state of a contract. If no block hash or block height are provided, the
contract state at the address in the latest block is returned.
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

`Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryContractState`](../../../midnight-js/types/interfaces/PublicDataProvider.md#querycontractstate)

***

### queryDeployContractState()

> **queryDeployContractState**(`contractAddress`): `Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

Retrieves the contract state included in the deployment of the contract at the given contract address.
Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryDeployContractState`](../../../midnight-js/types/interfaces/PublicDataProvider.md#querydeploycontractstate)

***

### queryLatestProtocolVersion()

> **queryLatestProtocolVersion**(): `Promise`\<`number`\>

Reads the protocol-version integer of the network's head block.

The indexer's `block` root field with no offset resolves to the latest
indexed block, so this is the head version.

This implementation does not cache: every call issues a request. The
interface permits a cache bounded short of block time — see
`PublicDataProvider.queryLatestProtocolVersion` — but there is no measured
cost here to spend that budget on, and an expiring cache is not free to
get right. For the era of a record already read, use
[queryRawContractState](#queryrawcontractstate), which costs no request at all.

#### Returns

`Promise`\<`number`\>

#### Throws

When the indexer has not indexed a block yet
  and therefore reports no head block.

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryLatestProtocolVersion`](../../../midnight-js/types/interfaces/PublicDataProvider.md#querylatestprotocolversion)

***

### queryRawContractState()

> **queryRawContractState**(`address`, `config?`): `Promise`\<[`RawContractState`](../../../midnight-js/types/interfaces/RawContractState.md) \| `null`\>

Reads the contract state at `address` as the bytes the indexer served,
without deserializing them, paired with the ledger era those bytes belong
to.

The block that dates the state and the state itself are asked for in a
single document. That saves a round trip; it does **not** make the two
fields a consistent snapshot — the indexer resolves Query-root siblings
concurrently, from independent reads, so they can still come from
different blocks. The era on the returned record therefore describes the
block that dated these bytes, and is not a reading of where the network is
now: for that, ask [queryLatestProtocolVersion](#querylatestprotocolversion), which reads it.

#### Parameters

##### address

`string`

##### config?

[`BlockHeightConfig`](../../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../../midnight-js/types/type-aliases/BlockHashConfig.md)

#### Returns

`Promise`\<[`RawContractState`](../../../midnight-js/types/interfaces/RawContractState.md) \| `null`\>

#### Throws

When the served state does not carry a
  contract-state envelope from a supported ledger runtime.

#### Throws

When the served state is not hex-encoded, or
  when a state is served with no block to date it.

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryRawContractState`](../../../midnight-js/types/interfaces/PublicDataProvider.md#queryrawcontractstate)

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

> **queryZSwapAndContractState**(`address`, `config?`): `Promise`\<\[[`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger), [`ContractState`](https://github.com/midnightntwrk/midnight-ledger), [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)\] \| `null`\>

Retrieves the zswap chain state (token balances), the contract state of the contract at the
given address, and the ledger parameters in effect on the associated block. Both states are
retrieved in a single query to ensure consistency between the two.
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

`Promise`\<\[[`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger), [`ContractState`](https://github.com/midnightntwrk/midnight-ledger), [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)\] \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryZSwapAndContractState`](../../../midnight-js/types/interfaces/PublicDataProvider.md#queryzswapandcontractstate)

***

### rawContractStateObservable()

> **rawContractStateObservable**(`contractAddress`, `config?`): `Observable`\<[`PositionedRecord`](../../../midnight-js/types/type-aliases/PositionedRecord.md)\<[`RawContractState`](../../../midnight-js/types/interfaces/RawContractState.md)\>\>

Creates a stream of contract states for `contractAddress` as the bytes the
indexer served, without deserializing them.

The streaming twin of [queryRawContractState](#queryrawcontractstate): no era of contract
state ends this subscription, because none is deserialized here.
[contractStateObservable](#contractstateobservable) decodes with the current era's runtime
inside the pipeline, so one retained-era state terminates that
subscription; here the era is carried on the record and the caller narrows
on it.

`ledgerParameters` IS ALWAYS ABSENT ON THIS STREAM. The subscription does
not ask for the parameters, which would cost one blob per contract action.
A caller that needs them reads [queryRawContractState](#queryrawcontractstate) with the
`blockHash` of the same record.

Every branch and every replay-suppression rule is exactly
[contractStateObservable](#contractstateobservable)'s; only the element type differs.

WHAT IS WITHHELD, PRECISELY: the deserialization, and the envelope-versus-
served-era cross-check [parseHexContractState](../functions/parseHexContractState.md) runs. The envelope tag
is still read, so a payload carrying no supported contract-state envelope
still fails the stream. Two things can still end it on era grounds — an
envelope from an era this client's tag table does not list, and a
`protocolVersion` integer it cannot place on the era timeline. The second
is the one asymmetry with [contractStateObservable](#contractstateobservable), which tolerates
such an integer and decodes on the envelope alone; here `version` is a
required field with nothing to fall back to, so the read is refused as
[IndexerDataError](IndexerDataError.md) with `kind: 'unresolvable-era'` rather than
guessed. Both arrive as an `IndexerError`, like every other failure from
this package.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`ContractStateObservableConfig`](../../../midnight-js/types/type-aliases/ContractStateObservableConfig.md) = `DEFAULT_STATE_CONFIG`

The configuration of the stream. Defaults to `latest`.

#### Returns

`Observable`\<[`PositionedRecord`](../../../midnight-js/types/type-aliases/PositionedRecord.md)\<[`RawContractState`](../../../midnight-js/types/interfaces/RawContractState.md)\>\>

#### See

[SubscriptionShapes](../../documents/SubscriptionShapes.md) for how each branch starts.

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`rawContractStateObservable`](../../../midnight-js/types/interfaces/PublicDataProvider.md#rawcontractstateobservable)

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

> **watchForContractState**(`contractAddress`): `Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>

Retrieves the contract state of the contract with the given address.
Waits indefinitely for matching data to appear.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForContractState`](../../../midnight-js/types/interfaces/PublicDataProvider.md#watchforcontractstate)

***

### watchForDeployTxData()

> **watchForDeployTxData**(`contractAddress`): `Promise`\<[`VersionedFinalizedTxData`](../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)\>

Not declared `async`, so an invalid address is refused synchronously. The
record itself is built after the poll resolves, because the era's runtime
may still have to be acquired.

#### Parameters

##### contractAddress

`string`

#### Returns

`Promise`\<[`VersionedFinalizedTxData`](../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)\>

#### Implementation of

[`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForDeployTxData`](../../../midnight-js/types/interfaces/PublicDataProvider.md#watchfordeploytxdata)

***

### watchForTxData()

> **watchForTxData**(`txId`): `Promise`\<[`VersionedFinalizedTxData`](../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)\>

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

`Promise`\<[`VersionedFinalizedTxData`](../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)\>

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
