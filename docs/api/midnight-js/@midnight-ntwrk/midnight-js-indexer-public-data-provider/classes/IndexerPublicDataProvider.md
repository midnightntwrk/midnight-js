[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / IndexerPublicDataProvider

# Class: IndexerPublicDataProvider

Interface for a public data service. This service retrieves public data from the blockchain.
TODO: Add timeouts or retry limits to 'watchFor' queries.

## Implements

- [`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md)

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

> **contractEventsObservable**(`filter`, `opts?`): `Observable`\<[`ContractEvent`](../../midnight-js/types/type-aliases/ContractEvent.md)\>

Streams contract events for `filter.contractAddress`, replaying from
`opts.startAt` then continuing live. Request building and validation are
delegated to buildSubscriptionVariables, which throws
**synchronously** on an invalid filter (mirroring the other observable
methods). See the [PublicDataProvider.contractEventsObservable](../../midnight-js/types/interfaces/PublicDataProvider.md#contracteventsobservable)
contract for cursor, completion, and at-least-once semantics.

#### Parameters

##### filter

[`ContractEventSubscriptionFilter`](../../midnight-js/types/interfaces/ContractEventSubscriptionFilter.md)

##### opts?

###### startAt?

[`ContractEventCursor`](../../midnight-js/types/type-aliases/ContractEventCursor.md)

#### Returns

`Observable`\<[`ContractEvent`](../../midnight-js/types/type-aliases/ContractEvent.md)\>

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`contractEventsObservable`](../../midnight-js/types/interfaces/PublicDataProvider.md#contracteventsobservable)

***

### contractStateObservable()

> **contractStateObservable**(`contractAddress`, `config?`): `Observable`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>

Creates a stream of contract states for `contractAddress`.

**Wire-traffic asymmetry by branch:**

| Branch                                 | Pipeline                                                                                            | Wire traffic |
|----------------------------------------|-----------------------------------------------------------------------------------------------------|--------------|
| `latest` / `blockHeight` / `blockHash` | poll for block-presence → `TXS_FROM_BLOCK_SUB` + client-side address filter                          | **Heavy** — every block on chain flows over WS; client extracts states for this contract. |
| `txId`                                 | poll `TX_ID_QUERY` → `TXS_FROM_BLOCK_SUB` from the tx's block → walk states matching the identifier  | **Heavy** — same `TXS_FROM_BLOCK_SUB` subscription as above, opened once the tx is located. |
| `all`                                  | poll for contract-presence → `CONTRACT_STATE_SUB($address, offset: null)`                            | **Light** — server-side filter; only this contract's state changes flow over WS. |

The heavy path emits one observable value per matching contract action
in each block — a per-block "states-at-this-block" view. It is used
everywhere a block-level anchor matters (latest block, specific block
with `inclusive`, transaction → containing-block). The light path
(`all`) emits one value per state change directly from the
server-filtered subscription — bandwidth scales with state changes
rather than chain activity.

Why not unify: `CONTRACT_STATE_SUB` is per-change, so a downstream
`Rx.skip(1)` would skip the first state change rather than the first
block — `inclusive: false` on `blockHeight`/`blockHash` would have a
subtly different meaning. `TXS_FROM_BLOCK_SUB` for `all` would stream
every block on chain (orders of magnitude more bytes on a busy chain).

See blockOffsetToBlock$, blockOffsetToContractState$,
and blockToContractState$ for per-subscription docs.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`ContractStateObservableConfig`](../../midnight-js/types/type-aliases/ContractStateObservableConfig.md) = `...`

The configuration of the stream. Defaults to `latest`.

#### Returns

`Observable`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)\>

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`contractStateObservable`](../../midnight-js/types/interfaces/PublicDataProvider.md#contractstateobservable)

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

> **queryBlock**(`config?`): `Promise`\<[`BlockInfo`](../../midnight-js/types/type-aliases/BlockInfo.md) \| `null`\>

Retrieves a block. If no block hash or block height is provided, the latest block is returned.
Immediately returns null if no matching block is found.

#### Parameters

##### config?

[`BlockHeightConfig`](../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../midnight-js/types/type-aliases/BlockHashConfig.md)

The configuration of the query identifying the block of interest.
              If `undefined` returns the latest block.

#### Returns

`Promise`\<[`BlockInfo`](../../midnight-js/types/type-aliases/BlockInfo.md) \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryBlock`](../../midnight-js/types/interfaces/PublicDataProvider.md#queryblock)

***

### queryContractEvents()

> **queryContractEvents**(`filter`, `page?`): `Promise`\<[`ContractEvent`](../../midnight-js/types/type-aliases/ContractEvent.md)[]\>

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

[`ContractEventQueryFilter`](../../midnight-js/types/interfaces/ContractEventQueryFilter.md)

##### page?

[`ContractEventsPage`](../../midnight-js/types/interfaces/ContractEventsPage.md)

#### Returns

`Promise`\<[`ContractEvent`](../../midnight-js/types/type-aliases/ContractEvent.md)[]\>

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryContractEvents`](../../midnight-js/types/interfaces/PublicDataProvider.md#querycontractevents)

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

[`BlockHeightConfig`](../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../midnight-js/types/type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`ContractState`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryContractState`](../../midnight-js/types/interfaces/PublicDataProvider.md#querycontractstate)

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

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryDeployContractState`](../../midnight-js/types/interfaces/PublicDataProvider.md#querydeploycontractstate)

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

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryLatestProtocolVersion`](../../midnight-js/types/interfaces/PublicDataProvider.md#querylatestprotocolversion)

***

### queryRawContractState()

> **queryRawContractState**(`address`, `config?`): `Promise`\<[`RawContractState`](../../midnight-js/types/interfaces/RawContractState.md) \| `null`\>

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

[`BlockHeightConfig`](../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../midnight-js/types/type-aliases/BlockHashConfig.md)

#### Returns

`Promise`\<[`RawContractState`](../../midnight-js/types/interfaces/RawContractState.md) \| `null`\>

#### Throws

When the served state does not carry a
  contract-state envelope from a supported ledger runtime.

#### Throws

When the served state is not hex-encoded, or
  when a state is served with no block to date it.

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryRawContractState`](../../midnight-js/types/interfaces/PublicDataProvider.md#queryrawcontractstate)

***

### queryUnshieldedBalances()

> **queryUnshieldedBalances**(`address`, `config?`): `Promise`\<[`UnshieldedBalances`](../../midnight-js/types/type-aliases/UnshieldedBalances.md) \| `null`\>

Retrieves the unshielded balances associated with a specific contract address.

#### Parameters

##### address

`string`

The address of the contract of interest.

##### config?

[`BlockHeightConfig`](../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../midnight-js/types/type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<[`UnshieldedBalances`](../../midnight-js/types/type-aliases/UnshieldedBalances.md) \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryUnshieldedBalances`](../../midnight-js/types/interfaces/PublicDataProvider.md#queryunshieldedbalances)

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

[`BlockHeightConfig`](../../midnight-js/types/type-aliases/BlockHeightConfig.md) \| [`BlockHashConfig`](../../midnight-js/types/type-aliases/BlockHashConfig.md)

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<\[[`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger), [`ContractState`](https://github.com/midnightntwrk/midnight-ledger), [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)\] \| `null`\>

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`queryZSwapAndContractState`](../../midnight-js/types/interfaces/PublicDataProvider.md#queryzswapandcontractstate)

***

### unshieldedBalancesObservable()

> **unshieldedBalancesObservable**(`contractAddress`, `config?`): `Observable`\<[`UnshieldedBalances`](../../midnight-js/types/type-aliases/UnshieldedBalances.md)\>

Creates a stream of unshielded balances for `contractAddress`.

All three non-`txId` branches (`latest`/`all`/`blockHeight`/`blockHash`)
use `UNSHIELDED_BALANCE_SUB($address, $offset)` as the terminal
subscription. **Wire traffic is uniformly light** — server-side
filtered by `contractAddress`. The indexer has no per-block
subscription analogue for balances, so there is no light/heavy
asymmetry comparable to [contractStateObservable](#contractstateobservable).

The `txId` configuration is not supported and throws
[IndexerProviderConfigError](IndexerProviderConfigError.md). Tx-anchored balance streams are
not exposed by the indexer's subscription surface — for the related
contract-state stream see [contractStateObservable](#contractstateobservable).

See blockOffsetToUnshieldedBalances$ for the per-subscription doc.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

##### config?

[`ContractStateObservableConfig`](../../midnight-js/types/type-aliases/ContractStateObservableConfig.md) = `...`

The configuration of the stream. Defaults to `latest`.

#### Returns

`Observable`\<[`UnshieldedBalances`](../../midnight-js/types/type-aliases/UnshieldedBalances.md)\>

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`unshieldedBalancesObservable`](../../midnight-js/types/interfaces/PublicDataProvider.md#unshieldedbalancesobservable)

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

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForContractState`](../../midnight-js/types/interfaces/PublicDataProvider.md#watchforcontractstate)

***

### watchForDeployTxData()

> **watchForDeployTxData**(`contractAddress`): `Promise`\<[`VersionedFinalizedTxData`](../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)\>

Not declared `async`, so an invalid address is refused synchronously. The
record itself is built after the poll resolves, because the era's runtime
may still have to be acquired.

#### Parameters

##### contractAddress

`string`

#### Returns

`Promise`\<[`VersionedFinalizedTxData`](../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)\>

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForDeployTxData`](../../midnight-js/types/interfaces/PublicDataProvider.md#watchfordeploytxdata)

***

### watchForTxData()

> **watchForTxData**(`txId`): `Promise`\<[`VersionedFinalizedTxData`](../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)\>

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

`Promise`\<[`VersionedFinalizedTxData`](../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)\>

A promise that resolves with finalized transaction data when the transaction appears on-chain.
         The promise never rejects due to timeout.

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForTxData`](../../midnight-js/types/interfaces/PublicDataProvider.md#watchfortxdata)

***

### watchForUnshieldedBalances()

> **watchForUnshieldedBalances**(`contractAddress`): `Promise`\<[`UnshieldedBalances`](../../midnight-js/types/type-aliases/UnshieldedBalances.md)\>

Monitors for any unshielded balances associated with a specific contract address.

#### Parameters

##### contractAddress

`string`

The address of the contract to monitor for unshielded balances.

#### Returns

`Promise`\<[`UnshieldedBalances`](../../midnight-js/types/type-aliases/UnshieldedBalances.md)\>

A promise that resolves to the detected unshielded balances.

#### Implementation of

[`PublicDataProvider`](../../midnight-js/types/interfaces/PublicDataProvider.md).[`watchForUnshieldedBalances`](../../midnight-js/types/interfaces/PublicDataProvider.md#watchforunshieldedbalances)
