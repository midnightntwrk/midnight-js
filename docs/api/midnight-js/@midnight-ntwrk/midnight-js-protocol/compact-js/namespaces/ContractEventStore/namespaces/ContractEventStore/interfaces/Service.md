[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../../README.md) / [compact-js](../../../../../README.md) / [ContractEventStore](../../../README.md) / [ContractEventStore](../README.md) / Service

# Interface: Service

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:89

Provides an in-process store, query surface, and subscription feed for contract log events.

## Properties

### append

> `readonly` **append**: (`events`) => `Effect`\<readonly [`StoredEvent`](../../../type-aliases/StoredEvent.md)[]\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:97

Appends events to the store, assigning each a monotonic `id`, and returns them as
[StoredEvent](../../../type-aliases/StoredEvent.md)s in append order.

#### Parameters

##### events

readonly [`ContractEvent`](../../../../ContractLog/type-aliases/ContractEvent.md)[]

The decoded events to append (e.g. `ContractLog.decodeAll(result.events)`).

#### Returns

`Effect`\<readonly [`StoredEvent`](../../../type-aliases/StoredEvent.md)[]\>

An `Effect` yielding the stored events, each tagged with its assigned `id`.

***

### query

> `readonly` **query**: (`filter?`) => `Effect`\<readonly [`StoredEvent`](../../../type-aliases/StoredEvent.md)[], [`MalformedHexPrefixError`](../../../../../effect/namespaces/MalformedHexPrefixError/classes/MalformedHexPrefixError.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:106

Returns the accumulated events matching `filter`, in ascending `id` order.

#### Parameters

##### filter?

[`ContractEventFilter`](../../../interfaces/ContractEventFilter.md)

The criteria to match; when omitted, all events are returned.

#### Returns

`Effect`\<readonly [`StoredEvent`](../../../type-aliases/StoredEvent.md)[], [`MalformedHexPrefixError`](../../../../../effect/namespaces/MalformedHexPrefixError/classes/MalformedHexPrefixError.md)\>

An `Effect` yielding the matching events, or failing with a
[MalformedHexPrefixError.MalformedHexPrefixError](../../../../../effect/namespaces/MalformedHexPrefixError/classes/MalformedHexPrefixError.md) if any `fieldPrefixes` prefix is not
valid hex.

***

### subscribe

> `readonly` **subscribe**: (`filter?`) => `Stream`\<[`StoredEvent`](../../../type-aliases/StoredEvent.md), [`MalformedHexPrefixError`](../../../../../effect/namespaces/MalformedHexPrefixError/classes/MalformedHexPrefixError.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:129

Subscribes to a live, filtered, resumable feed of events in ascending `id` order.

The stream first **replays** matching history (from `filter.fromId`, if given), then **tails**
newly appended events — with no gap or duplicate at the boundary. The same `filter` is applied
to both phases. The subscription is scope-managed: it is torn down automatically when the
enclosing `Scope` closes.

To resume after a disconnect, pass **`lastSeenId + 1n`** as `filter.fromId`: the cursor is
**inclusive** (`id >= fromId`), so passing the last-seen id itself would redeliver that event.

Under sustained backpressure the live feed may drop the oldest un-consumed events (see
[makeLayer](../../../variables/makeLayer.md)). There is **no programmatic drop signal** — a filter-induced `id` skip and
a drop-induced one are indistinguishable on the stream — so a subscriber that must not miss
events should periodically reconcile via `query`, and after falling behind reconnect with an
updated `fromId` to backfill the missed events from the retained history.

#### Parameters

##### filter?

[`ContractEventFilter`](../../../interfaces/ContractEventFilter.md)

The criteria to match; when omitted, every event is delivered. A `fieldPrefixes`
prefix that is not valid hex fails the stream with a
[MalformedHexPrefixError.MalformedHexPrefixError](../../../../../effect/namespaces/MalformedHexPrefixError/classes/MalformedHexPrefixError.md).

#### Returns

`Stream`\<[`StoredEvent`](../../../type-aliases/StoredEvent.md), [`MalformedHexPrefixError`](../../../../../effect/namespaces/MalformedHexPrefixError/classes/MalformedHexPrefixError.md)\>

A `Stream` of matching events.
