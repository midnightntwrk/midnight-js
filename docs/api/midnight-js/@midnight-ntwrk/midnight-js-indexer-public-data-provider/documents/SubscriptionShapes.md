[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / SubscriptionShapes

# Two subscription shapes, and why they are not unified

`contractStateObservable` serves four branches through TWO different GraphQL
subscriptions, with very different wire costs. The asymmetry is deliberate.
This document records what each shape costs, and why collapsing them onto one
subscription would change the meaning of a published option.

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
view from `blockOffsetToBlock$` + `blockToContractState$` is what gives that
option the meaning it documents.

## Why the others cannot simply become `all`

Running `TXS_FROM_BLOCK_SUB` for the `all` branch would stream every block on
chain to a client that wants one contract. On a busy chain that is orders of
magnitude more bytes for an identical result.

So the heavy path is not a fallback to be optimised away, and the light path is
not a special case to be generalised. Each branch uses the shape whose semantics
it actually needs, and pays the traffic that shape costs.
