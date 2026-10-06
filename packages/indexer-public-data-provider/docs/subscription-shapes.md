---
title: SubscriptionShapes
---

# One subscription shape for every stream

`contractStateObservable`, `rawContractStateObservable` and
`unshieldedBalancesObservable` read one indexer feed on every branch:
`contractActions(address, offset)`. The indexer filters it by address, so only
this contract's actions cross the WebSocket. This document records how each
branch is built on that feed, how a reconnect is kept from repeating values,
and why the two contract-state streams share one implementation.

The code is `src/provider.ts` and `src/observables.ts`.

## What the feed serves

`contractActions(address, offset)` serves every action of the contract from the
block at `offset` onward, that block included, and then continues live. Each
action carries its transaction, and the selection asks that transaction for its
block (`height`, `hash`), its `protocolVersion` and, for a regular transaction,
its `identifiers`. A system transaction has no identifiers, and its actions are
served like any other.

`CONTRACT_STATE_SUB` selects the action's `state`; `UNSHIELDED_BALANCE_SUB`
selects its `unshieldedBalances`. Everything below applies to both.

## How each branch starts

| Branch | Offset subscribed from | Start rule |
|---|---|---|
| `latest` | the block of the contract's latest action (`LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY`) | none |
| `all` | `{ height: 0 }`, once the contract exists | none |
| `blockHeight` / `blockHash` | the named block, once it exists | `inclusive: false` keeps only records with a greater block height |
| `txId` | the block of the named transaction (`TX_ID_QUERY`) | records of that block before the named transaction are dropped; `inclusive: false` drops the named transaction's own |

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

## Why one topology serves both contract-state members

The two public state streams differ in exactly one thing: what one served
contract action becomes. Everything else — which offset each config subscribes
from, where `ordinalWithinBlock` and `dropReplayed` sit, how each branch reads
`inclusive` — is the part that is easy to get subtly wrong, and two copies of
it would drift apart under maintenance.

So the topology is written once, as the private `contractStates$<T>`, and the
mapper is threaded through it: `parseHexContractState` for the decoded stream,
`toRawContractState` for the raw one. Both public members are one-line binds.
Because the type parameter is fixed once per stream, "the two streams cannot
diverge branch by branch" is a fact the compiler holds, not a review habit.

The balance stream reuses the block-anchored part of that topology
(`fromBlock$`) with its own feed, and has no `txId` branch.

The cost of that sharing is that one transcription error breaks every member at
once, which is why the branch behaviour that is invisible in a type — the start
rules and the replay suppression above all — is pinned by tests rather than by
review.
