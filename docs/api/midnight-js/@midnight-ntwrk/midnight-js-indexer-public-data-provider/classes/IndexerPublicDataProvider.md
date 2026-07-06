[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / IndexerPublicDataProvider

# Class: IndexerPublicDataProvider

## Implements

- [`PublicDataProvider`](#)

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

> **contractEventsObservable**(`filter`, `opts?`): `Observable`\<`ContractEvent`\>

Streams contract events for `filter.contractAddress`, replaying from
`opts.startAt` then continuing live. Request building and validation are
delegated to buildSubscriptionVariables, which throws
**synchronously** on an invalid filter (mirroring the other observable
methods). See the PublicDataProvider.contractEventsObservable
contract for cursor, completion, and at-least-once semantics.

#### Parameters

##### filter

`ContractEventSubscriptionFilter`

##### opts?

###### startAt?

`ContractEventCursor`

#### Returns

`Observable`\<`ContractEvent`\>

#### Implementation of

`PublicDataProvider.contractEventsObservable`

***

### contractStateObservable()

> **contractStateObservable**(`contractAddress`, `config?`): `Observable`\<`ContractState`\>

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

`ContractStateObservableConfig` = `...`

The configuration of the stream. Defaults to `latest`.

#### Returns

`Observable`\<`ContractState`\>

#### Implementation of

`PublicDataProvider.contractStateObservable`

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

> **queryBlock**(`config?`): `Promise`\<`BlockInfo` \| `null`\>

Retrieves a block. If no block hash or block height is provided, the latest block is returned.
Immediately returns null if no matching block is found.

#### Parameters

##### config?

`BlockHeightConfig` \| `BlockHashConfig`

The configuration of the query identifying the block of interest.
              If `undefined` returns the latest block.

#### Returns

`Promise`\<`BlockInfo` \| `null`\>

#### Implementation of

`PublicDataProvider.queryBlock`

***

### queryContractEvents()

> **queryContractEvents**(`filter`, `page?`): `Promise`\<`ContractEvent`[]\>

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

`ContractEventQueryFilter`

##### page?

`ContractEventsPage`

#### Returns

`Promise`\<`ContractEvent`[]\>

#### Implementation of

`PublicDataProvider.queryContractEvents`

***

### queryContractState()

> **queryContractState**(`address`, `config?`): `Promise`\<`ContractState` \| `null`\>

Retrieves the on-chain state of a contract. If no block hash or block height are provided, the
contract state at the address in the latest block is returned.
Immediately returns null if no matching data is found.

#### Parameters

##### address

`string`

##### config?

`BlockHeightConfig` \| `BlockHashConfig`

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<`ContractState` \| `null`\>

#### Implementation of

`PublicDataProvider.queryContractState`

***

### queryDeployContractState()

> **queryDeployContractState**(`contractAddress`): `Promise`\<`ContractState` \| `null`\>

Retrieves the contract state included in the deployment of the contract at the given contract address.
Immediately returns null if no matching data is found.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<`ContractState` \| `null`\>

#### Implementation of

`PublicDataProvider.queryDeployContractState`

***

### queryUnshieldedBalances()

> **queryUnshieldedBalances**(`address`, `config?`): `Promise`\<`UnshieldedBalances` \| `null`\>

Retrieves the unshielded balances associated with a specific contract address.

#### Parameters

##### address

`string`

##### config?

`BlockHeightConfig` \| `BlockHashConfig`

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<`UnshieldedBalances` \| `null`\>

#### Implementation of

`PublicDataProvider.queryUnshieldedBalances`

***

### queryZSwapAndContractState()

> **queryZSwapAndContractState**(`address`, `config?`): `Promise`\<\[`ZswapChainState`, `ContractState`, `LedgerParameters`\] \| `null`\>

Retrieves the zswap chain state (token balances), the contract state of the contract at the
given address, and the ledger parameters in effect on the associated block. Both states are
retrieved in a single query to ensure consistency between the two.
Immediately returns null if no matching data is found.

#### Parameters

##### address

`string`

##### config?

`BlockHeightConfig` \| `BlockHashConfig`

The configuration of the query.
              If `undefined` returns the latest states.

#### Returns

`Promise`\<\[`ZswapChainState`, `ContractState`, `LedgerParameters`\] \| `null`\>

#### Implementation of

`PublicDataProvider.queryZSwapAndContractState`

***

### unshieldedBalancesObservable()

> **unshieldedBalancesObservable**(`contractAddress`, `config?`): `Observable`\<`UnshieldedBalances`\>

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

`ContractStateObservableConfig` = `...`

The configuration of the stream. Defaults to `latest`.

#### Returns

`Observable`\<`UnshieldedBalances`\>

#### Implementation of

`PublicDataProvider.unshieldedBalancesObservable`

***

### watchForContractState()

> **watchForContractState**(`contractAddress`): `Promise`\<`ContractState`\>

Retrieves the contract state of the contract with the given address.
Waits indefinitely for matching data to appear.

#### Parameters

##### contractAddress

`string`

The address of the contract of interest.

#### Returns

`Promise`\<`ContractState`\>

#### Implementation of

`PublicDataProvider.watchForContractState`

***

### watchForDeployTxData()

> **watchForDeployTxData**(`contractAddress`): `Promise`\<`FinalizedTxData`\>

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

`Promise`\<`FinalizedTxData`\>

A promise that resolves with finalized transaction data when the deployment appears on-chain.
         The promise never rejects due to timeout.

#### Implementation of

`PublicDataProvider.watchForDeployTxData`

***

### watchForTxData()

> **watchForTxData**(`txId`): `Promise`\<`FinalizedTxData`\>

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

`Promise`\<`FinalizedTxData`\>

A promise that resolves with finalized transaction data when the transaction appears on-chain.
         The promise never rejects due to timeout.

#### Implementation of

`PublicDataProvider.watchForTxData`

***

### watchForUnshieldedBalances()

> **watchForUnshieldedBalances**(`contractAddress`): `Promise`\<`UnshieldedBalances`\>

Monitors for any unshielded balances associated with a specific contract address.

#### Parameters

##### contractAddress

`string`

The address of the contract to monitor for unshielded balances.

#### Returns

`Promise`\<`UnshieldedBalances`\>

A promise that resolves to the detected unshielded balances.

#### Implementation of

`PublicDataProvider.watchForUnshieldedBalances`
