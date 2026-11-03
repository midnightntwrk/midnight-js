---
title: SubscriptionShapes
---

# One subscription shape for every stream

`contractStateObservable` and `unshieldedBalancesObservable` read one indexer
feed on every branch:
`contractActions(address, offset)`. The indexer filters it by address, so only
this contract's actions cross the WebSocket. This document records how each
branch is built on that feed, how a reconnect is kept from repeating values,
and how the contract-state stream is put together.

The code is `src/provider.ts` and `src/observables.ts`.

## What the feed serves

`contractActions(address, offset)` serves every action of the contract from the
block at `offset` onward, that block included, and then continues live. Each
action carries `stateAt` (`height`, `hash`, `protocolVersion`): the block its
served state is dated by. For an ordinary action that is the action's own
block.

At a ledger fork the node translates every contract's state to the new
encoding in the fork block. From indexer `4.4.0-rc.6` on, the feed re-emits
each contract untouched since the fork: its latest action again, with the
translated state and `stateAt` set to the fork block. The re-emitted action's
transaction is still the pre-fork one.

`CONTRACT_STATE_SUB` selects the action's `state`, its `stateAt` and, for a
regular transaction, its `identifiers`. Each record is dated and positioned by
`stateAt`, so the re-emission is a record of the fork block, decoded with the
fork block's `protocolVersion`. A system transaction has no identifiers, and its
actions are served like any other.

`UNSHIELDED_BALANCE_SUB` selects the action's `unshieldedBalances`, its
transaction's block (`height`, `hash`) and `stateAt.hash`. A fork translates
the state, not the balances, so the balance stream drops the re-emission (an
action whose `stateAt` is not its own block) and positions each record by the
transaction's block. A record's block is all the replay suppression below
needs, so it applies to both.

Neither subscription is shared between identical requests: each passes
`queryDeduplication: false`, because Apollo would otherwise attach a second
subscriber to the first one's stream mid-way, without the history its offset
asks for.

## How each branch starts

| Branch | Offset subscribed from | Start rule |
|---|---|---|
| `latest` | for the state streams, `stateAt.height` of the contract's latest action, so a contract untouched since a fork starts at its fork-block re-emission; for the balance stream, the block of that action's transaction (`LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY`) | none |
| `all` | `{ height: 0 }`, once the contract exists | none |
| `blockHeight` / `blockHash` | the named block, once it exists | `inclusive: false` keeps only records with a greater block height |
| `txId` | the block of the named transaction (`TX_ID_QUERY`); a transaction with no action for the contract is refused with `IndexerProviderConfigError` before anything is subscribed | records of that block before the named transaction are dropped; `inclusive: false` drops the named transaction's own. After a fork it does not drop the re-emission: that record carries the same transaction identifiers but a higher block, so it is delivered |

`all` passes `{ height: 0 }` explicitly. The schema documents an omitted offset
as "the latest block", so the full history is not left to that reading.

`inclusive: false` on `blockHeight` and `blockHash` is defined in blocks: it is a
filter on the record's block height, so it skips a whole block however many
actions it carries. On `txId` it is defined in transactions.

## Why a reconnect repeats nothing

After a reconnect, `graphql-ws` subscribes again with the original variables and
pushes the indexer's replay into the same stream. Every branch therefore numbers
its records and drops the ones already delivered:

1. `ordinalWithinBlock` ranks each record within its block. The rank restarts
   at every new block and at every new connection, which the transport counts
   in its `connected` hook. A replay starts again from the original offset, so
   a replayed record gets the rank it had the first time.
2. The start rule runs on the ranked records. It is stateless, or, for `txId`,
   keeps only the named transaction's rank, so a reconnect cannot spend it.
3. `dropReplayed` drops every record at or behind the last delivered
   `(blockHeight, ordinal)`.

The rank is derived from the order the indexer serves a block's actions in; the
indexer asserts no identifier per action. The guard is therefore exact only if a
replay serves those actions in the same order.

## How the contract-state stream is built

The branch routing — which offset each config subscribes from, where
`ordinalWithinBlock` and `dropReplayed` sit, how each branch reads `inclusive` —
is the part that is easy to get subtly wrong. It is written once, as the private
`contractStates$<T>` with the routing in `contractStatesFeed$` and `fromBlock$`.
The mapper that turns one served contract action into a stream element is
passed in: `contractStateObservable` binds `toContractStateRead`, which builds
the record from bytes and decodes nothing. Tests bind a mapper of their own.

The balance stream reuses `fromBlock$` for `latest`, `blockHeight` and
`blockHash`, and repeats the rest: its own `all` branch, the
`ordinalWithinBlock` wiring and `dropReplayed`. It has no `txId` branch.

The cost of that sharing is that one transcription error breaks every member at
once, which is why the branch behaviour that is invisible in a type — the start
rules and the replay suppression above all — is pinned by tests rather than by
review.
