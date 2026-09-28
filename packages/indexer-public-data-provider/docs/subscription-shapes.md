---
title: SubscriptionShapes
---

# Two subscription shapes, and why they are not unified

`contractStateObservable` and `rawContractStateObservable` serve four branches
through TWO different GraphQL subscriptions, with very different wire costs. The
asymmetry is deliberate. This document records what each shape costs, why
collapsing them onto one subscription would change the meaning of a published
option, and why the two members share one implementation of the topology.

The code is `src/provider.ts` and `src/observables.ts`.

## What each branch costs

| Branch | Pipeline | Wire traffic |
|---|---|---|
| `latest` / `blockHeight` / `blockHash` | poll for block-presence → `TXS_FROM_BLOCK_SUB` + client-side address filter | **Heavy** — every block on chain flows over the WebSocket; the client extracts states for this contract |
| `txId` | poll `TX_ID_QUERY` → `TXS_FROM_BLOCK_SUB` from the tx's block → walk states matching the identifier | **Heavy** — the same subscription, opened once the transaction is located |
| `all` | poll for contract-presence → `CONTRACT_STATE_SUB($address, offset: null)` | **Light** — server-side filter; only this contract's state changes flow over the WebSocket |

The heavy path emits one value per matching contract action in each block — a
per-block "states at this block" view. The light path emits one value per state
change, straight from the server-filtered subscription, so bandwidth scales with
state changes rather than with chain activity.

## Why `all` cannot simply become the others

`CONTRACT_STATE_SUB` is a PER-CHANGE feed. A downstream `Rx.skip(1)` on it skips
the first state CHANGE, not the first BLOCK.

That is what makes the two shapes non-interchangeable: `inclusive: false` on
`blockHeight` and `blockHash` is defined in blocks. Served from a per-change
feed, the same published option would quietly mean something else. The per-block
view from `blockOffsetToBlock$` + `blockToPositionedState$` is what gives that
option the meaning it documents.

## Why one topology serves both members

The two public state streams differ in exactly one thing: what one served
contract action becomes. Everything else — which subscription each config
reaches, where `dropReplayed` sits, which branches honour `inclusive` and
whether `inclusive` counts blocks or states — is the part that is easy to get
subtly wrong, and two copies of it would drift apart under maintenance.

So the topology is written once, as the private `contractStates$<T>`, and the
mapper is threaded through it: `parseHexContractState` for the decoded stream,
`toRawContractState` for the raw one. Both public members are one-line binds.
Because the type parameter is fixed once per stream, "the two streams cannot
diverge branch by branch" is a fact the compiler holds, not a review habit.

The cost of that sharing is that one transcription error breaks both members at
once, which is why the branch behaviour that is invisible in a type — the two
readings of `inclusive` above all — is pinned by tests rather than by review.

## Why the others cannot simply become `all`

Running `TXS_FROM_BLOCK_SUB` for the `all` branch would stream every block on
chain to a client that wants one contract. On a busy chain that is orders of
magnitude more bytes for an identical result.

So the heavy path is not a fallback to be optimised away, and the light path is
not a special case to be generalised. Each branch uses the shape whose semantics
it actually needs, and pays the traffic that shape costs.
